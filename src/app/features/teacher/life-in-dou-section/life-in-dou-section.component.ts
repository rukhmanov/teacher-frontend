import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { LifeInDOU, MediaItem, Folder } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel.component';

@Component({
  selector: 'app-life-in-dou-section',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCarouselComponent],
  templateUrl: './life-in-dou-section.component.html',
  styleUrl: './life-in-dou-section.component.scss',
})
export class LifeInDOUSectionComponent implements OnInit {
  lifeInDOU: LifeInDOU | null = null;
  folders: Folder[] = [];
  username: string = '';
  isEditMode = false;
  placeholder = PlaceholderUtil;
  
  selectedFiles: File[] = [];
  isUploading = false;
  selectedFolderId: string | null = null;
  showFolderForm = false;
  newFolderName = '';
  expandedFolders: Set<string> = new Set();
  
  // Карусель изображений
  showCarousel: boolean = false;
  carouselImages: string[] = [];
  carouselStartIndex: number = 0;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private uploadService: UploadService,
  ) {}

  ngOnInit() {
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicLifeInDOU();
      } else {
        this.isEditMode = true;
        this.loadOwnLifeInDOU();
      }
    });
  }

  loadPublicLifeInDOU() {
    if (this.username) {
      this.teachersService.getLifeInDOU(this.username).subscribe({
        next: (item) => {
          this.lifeInDOU = item;
        },
      });
      this.teachersService.getFolders(this.username).subscribe({
        next: (folders) => {
          this.folders = folders;
        },
      });
    }
  }

  loadOwnLifeInDOU() {
    this.teachersService.getOwnLifeInDOU().subscribe({
      next: (item) => {
        this.lifeInDOU = item;
      },
    });
    this.teachersService.getOwnFolders().subscribe({
      next: (folders) => {
        this.folders = folders;
      },
    });
  }

  onMediaSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  uploadMedia() {
    if (this.selectedFiles.length === 0) {
      alert('Пожалуйста, выберите файлы для загрузки');
      return;
    }

    this.isUploading = true;
    
    const uploadObservables = this.selectedFiles.map(file => {
      const type = file.type.startsWith('image/') ? 'photo' : 'video';
      if (type === 'photo') {
        return this.uploadService.uploadImage(file).pipe(
          map(response => ({ type: 'photo' as const, url: response.url }))
        );
      } else {
        return this.uploadService.uploadFile(file).pipe(
          map(response => ({ type: 'video' as const, url: response.url }))
        );
      }
    });

    // Загружаем все файлы параллельно
    forkJoin(uploadObservables).subscribe({
      next: (mediaItems) => {
        if (this.selectedFolderId) {
          // Добавляем в папку
          const addToFolderObservables = mediaItems.map(item =>
            this.teachersService.addMediaToFolder(this.selectedFolderId!, item)
          );
          forkJoin(addToFolderObservables).subscribe({
            next: () => {
              this.loadOwnLifeInDOU();
              this.selectedFiles = [];
              this.selectedFolderId = null;
              this.isUploading = false;
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) {
                fileInput.value = '';
              }
            },
            error: (err: any) => {
              console.error('Error adding media to folder:', err);
              this.isUploading = false;
              alert('Ошибка при добавлении медиа в папку');
            },
          });
        } else {
          // Добавляем в основной раздел
          const addObservables = mediaItems.map(item => 
            this.teachersService.addMediaToLifeInDOU(item)
          );
          forkJoin(addObservables).subscribe({
            next: () => {
              this.loadOwnLifeInDOU();
              this.selectedFiles = [];
              this.isUploading = false;
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) {
                fileInput.value = '';
              }
            },
            error: (err: any) => {
              console.error('Error adding media:', err);
              this.isUploading = false;
              alert('Ошибка при добавлении медиа элементов');
            },
          });
        }
      },
      error: (err: any) => {
        console.error('Error uploading files:', err);
        this.isUploading = false;
        const errorMessage = err?.error?.message || err?.message || 'Ошибка при загрузке файлов';
        alert(`Ошибка при загрузке файлов: ${errorMessage}`);
      },
    });
  }

  deleteMedia(mediaUrl: string) {
    if (confirm('Удалить этот элемент?')) {
      this.teachersService.removeMediaFromLifeInDOU(mediaUrl).subscribe({
        next: () => {
          this.loadOwnLifeInDOU();
        },
        error: (err: any) => {
          console.error('Error deleting media:', err);
          alert('Ошибка при удалении элемента');
        },
      });
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholder.getGalleryPlaceholder();
    }
  }

  getMediaItems(): MediaItem[] {
    if (!this.lifeInDOU || !this.lifeInDOU.mediaItems) {
      return [];
    }
    
    return this.lifeInDOU.mediaItems.filter(
      (item: any) => 
        item && 
        typeof item === 'object' && 
        item.url && 
        item.type &&
        !Array.isArray(item)
    ) as MediaItem[];
  }

  getPhotoUrls(): string[] {
    const allPhotos: string[] = [];
    
    // Добавляем фото из основного раздела
    const mainPhotos = this.getMediaItems()
      .filter(item => item.type === 'photo')
      .map(item => item.url);
    allPhotos.push(...mainPhotos);
    
    // Добавляем фото из всех папок
    if (this.folders) {
      this.folders.forEach(folder => {
        if (folder.mediaItems) {
          const folderPhotos = folder.mediaItems
            .filter((item: any) => item && typeof item === 'object' && item.type === 'photo')
            .map((item: any) => item.url);
          allPhotos.push(...folderPhotos);
        }
      });
    }
    
    return allPhotos;
  }

  openImageCarousel(images: string[], startIndex: number = 0): void {
    this.carouselImages = images;
    this.carouselStartIndex = startIndex;
    this.showCarousel = true;
  }

  closeCarousel(): void {
    this.showCarousel = false;
    this.carouselImages = [];
    this.carouselStartIndex = 0;
  }

  getImageUrl(url: string | null | undefined): string {
    return PlaceholderUtil.getImageUrl(url, 'gallery');
  }

  // Folder methods
  createFolder() {
    if (!this.newFolderName.trim()) {
      alert('Введите название папки');
      return;
    }

    this.teachersService.createFolder({ name: this.newFolderName.trim() }).subscribe({
      next: () => {
        this.newFolderName = '';
        this.showFolderForm = false;
        this.loadOwnLifeInDOU();
      },
      error: (err: any) => {
        console.error('Error creating folder:', err);
        alert('Ошибка при создании папки');
      },
    });
  }

  toggleFolder(folderId: string) {
    if (this.expandedFolders.has(folderId)) {
      this.expandedFolders.delete(folderId);
    } else {
      this.expandedFolders.add(folderId);
    }
  }

  isFolderExpanded(folderId: string): boolean {
    return this.expandedFolders.has(folderId);
  }

  deleteFolder(folderId: string) {
    if (confirm('Удалить эту папку? Все содержимое будет удалено.')) {
      this.teachersService.deleteFolder(folderId).subscribe({
        next: () => {
          this.loadOwnLifeInDOU();
        },
        error: (err: any) => {
          console.error('Error deleting folder:', err);
          alert('Ошибка при удалении папки');
        },
      });
    }
  }

  deleteMediaFromFolder(folderId: string, mediaUrl: string) {
    if (confirm('Удалить этот элемент из папки?')) {
      this.teachersService.removeMediaFromFolder(folderId, mediaUrl).subscribe({
        next: () => {
          this.loadOwnLifeInDOU();
        },
        error: (err: any) => {
          console.error('Error deleting media from folder:', err);
          alert('Ошибка при удалении элемента');
        },
      });
    }
  }

  getFolderMediaItems(folder: Folder): MediaItem[] {
    if (!folder.mediaItems) {
      return [];
    }
    return folder.mediaItems.filter(
      (item: any) =>
        item &&
        typeof item === 'object' &&
        item.url &&
        item.type &&
        !Array.isArray(item)
    ) as MediaItem[];
  }

  getFolderName(folderId: string | null): string {
    if (!folderId) return '';
    const folder = this.folders.find(f => f.id === folderId);
    return folder?.name || '';
  }

  moveMedia(mediaItem: MediaItem, sourceFolderId: string | null, targetFolderId: string | null) {
    this.teachersService.moveMedia(mediaItem, sourceFolderId, targetFolderId).subscribe({
      next: () => {
        this.loadOwnLifeInDOU();
      },
      error: (err: any) => {
        console.error('Error moving media:', err);
        alert('Ошибка при перемещении элемента');
      },
    });
  }

  showMoveMenu: { [key: string]: boolean } = {};

  toggleMoveMenu(mediaUrl: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    // Закрываем все остальные меню
    Object.keys(this.showMoveMenu).forEach(key => {
      if (key !== mediaUrl) {
        this.showMoveMenu[key] = false;
      }
    });
    this.showMoveMenu[mediaUrl] = !this.showMoveMenu[mediaUrl];
  }

  onMoveMedia(mediaItem: MediaItem, sourceFolderId: string | null, targetFolderId: string | null, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.moveMedia(mediaItem, sourceFolderId, targetFolderId);
    this.showMoveMenu[mediaItem.url] = false;
  }

  closeAllMoveMenus() {
    Object.keys(this.showMoveMenu).forEach(key => {
      this.showMoveMenu[key] = false;
    });
  }
}




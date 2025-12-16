import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { LifeInDOU, MediaItem } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-life-in-dou-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './life-in-dou-section.component.html',
  styleUrl: './life-in-dou-section.component.scss',
})
export class LifeInDOUSectionComponent implements OnInit {
  lifeInDOU: LifeInDOU | null = null;
  username: string = '';
  isEditMode = false;
  placeholder = PlaceholderUtil;
  
  selectedFiles: File[] = [];
  isUploading = false;

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
    }
  }

  loadOwnLifeInDOU() {
    this.teachersService.getOwnLifeInDOU().subscribe({
      next: (item) => {
        this.lifeInDOU = item;
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
        // Добавляем медиа элементы по одному
        const addObservables = mediaItems.map(item => 
          this.teachersService.addMediaToLifeInDOU(item)
        );
        
        forkJoin(addObservables).subscribe({
          next: () => {
            this.loadOwnLifeInDOU();
            this.selectedFiles = [];
            this.isUploading = false;
            // Очищаем input
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) {
              fileInput.value = '';
            }
          },
          error: (err) => {
            console.error('Error adding media:', err);
            this.isUploading = false;
            alert('Ошибка при добавлении медиа элементов');
          },
        });
      },
      error: (err) => {
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
        error: (err) => {
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
}

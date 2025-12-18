import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { MasterClass } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel.component';

@Component({
  selector: 'app-master-classes-section',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCarouselComponent],
  templateUrl: './master-classes-section.component.html',
  styleUrl: './master-classes-section.component.scss',
})
export class MasterClassesSectionComponent implements OnInit {
  masterClasses: MasterClass[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  editingMasterClassId: string | null = null;
  newMasterClass: Partial<MasterClass> & { images: string[] } = {
    title: '',
    description: '',
    content: '',
    images: [],
    cardColor: '',
  };
  placeholder = PlaceholderUtil;
  
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  
  // Карусель изображений
  showCarousel: boolean = false;
  carouselImages: string[] = [];
  carouselStartIndex: number = 0;

  // Модальное окно
  showModal: boolean = false;
  selectedMasterClass: MasterClass | null = null;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private authService: AuthService,
    private uploadService: UploadService,
  ) {}
  
  onImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.selectedImages = Array.from(input.files);
      this.imagePreviews = [];
      this.selectedImages.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            this.imagePreviews.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removeImage(index: number) {
    this.selectedImages.splice(index, 1);
    this.imagePreviews.splice(index, 1);
  }

  onImageError(event: Event, type: 'avatar' | 'post' | 'gallery' = 'post') {
    const img = event.target as HTMLImageElement;
    if (img) {
      switch (type) {
        case 'post':
          img.src = this.placeholder.getPostImagePlaceholder();
          break;
        case 'gallery':
          img.src = this.placeholder.getGalleryPlaceholder();
          break;
        default:
          img.src = this.placeholder.getAvatarPlaceholder();
      }
    }
  }

  getImageUrl(url: string | null | undefined, type: 'avatar' | 'post' | 'gallery' = 'post'): string {
    return PlaceholderUtil.getImageUrl(url, type);
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

  ngOnInit() {
    // username находится в родительском роуте для публичных страниц
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicMasterClasses();
      } else {
        this.isEditMode = true;
        this.loadOwnMasterClasses();
      }
    });
  }

  loadPublicMasterClasses() {
    if (this.username) {
      this.teachersService.getMasterClasses(this.username).subscribe({
        next: (classes) => {
          this.masterClasses = classes;
        },
      });
    }
  }

  loadOwnMasterClasses() {
    this.teachersService.getOwnMasterClasses().subscribe({
      next: (classes) => {
        this.masterClasses = classes;
      },
    });
  }

  createMasterClass() {
    this.continueMasterClassCreation();
  }

  private continueMasterClassCreation() {
    if (this.selectedImages.length > 0) {
      // Загружаем изображения
      const uploadObservables = this.selectedImages.map(file => 
        this.uploadService.uploadImage(file)
      );
      
      // Используем forkJoin для параллельной загрузки
      forkJoin(uploadObservables).subscribe({
        next: (results) => {
          // Добавляем новые изображения к существующим (если редактируем)
          const newImageUrls = results.map(r => r.url);
          this.newMasterClass.images = [...(this.newMasterClass.images || []), ...newImageUrls];
          this.submitMasterClass();
        },
        error: (err) => {
          console.error('Error uploading images:', err);
          this.submitMasterClass();
        },
      });
    } else {
      this.submitMasterClass();
    }
  }

  private submitMasterClass() {
    if (this.editingMasterClassId) {
      this.teachersService.updateMasterClass(this.editingMasterClassId, this.newMasterClass as any).subscribe({
        next: () => {
          this.loadOwnMasterClasses();
          this.cancelEdit();
        },
      });
    } else {
      this.teachersService.createMasterClass(this.newMasterClass as any).subscribe({
        next: () => {
          this.loadOwnMasterClasses();
          this.cancelEdit();
        },
      });
    }
  }

  editMasterClass(masterClass: MasterClass) {
    this.editingMasterClassId = masterClass.id;
    this.newMasterClass = {
      title: masterClass.title,
      description: masterClass.description,
      content: masterClass.content,
      images: [...(masterClass.images || [])],
      cardColor: masterClass.cardColor || '',
    } as Partial<MasterClass> & { images: string[] };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingMasterClassId = null;
    this.newMasterClass = { title: '', description: '', content: '', images: [], cardColor: '' } as Partial<MasterClass> & { images: string[] };
    this.selectedImages = [];
    this.imagePreviews = [];
  }

  removeCardColor() {
    this.newMasterClass.cardColor = '';
  }

  deleteMasterClass(id: string) {
    if (confirm('Удалить этот мастер-класс?')) {
      this.teachersService.deleteMasterClass(id).subscribe({
        next: () => {
          this.loadOwnMasterClasses();
        },
      });
    }
  }

  getTruncatedContent(content: string | undefined): string {
    if (!content) return '';
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  }

  shouldShowFullButton(masterClass: MasterClass): boolean {
    const hasLongContent = masterClass.content && masterClass.content.length > 200;
    const hasDescription = masterClass.description && masterClass.description.length > 100;
    const hasManyImages = masterClass.images && masterClass.images.length > 3;
    return !!(hasLongContent || hasDescription || hasManyImages);
  }

  openModal(masterClass: MasterClass): void {
    this.selectedMasterClass = masterClass;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedMasterClass = null;
    document.body.style.overflow = '';
  }
}




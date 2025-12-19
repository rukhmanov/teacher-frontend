import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
    fileUrl: '',
    cardColor: '',
  };
  placeholder = PlaceholderUtil;
  
  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  selectedFile: File | null = null;
  useFileUpload = false;
  isUploading = false;
  
  // Карусель изображений
  showCarousel: boolean = false;
  carouselImages: string[] = [];
  carouselStartIndex: number = 0;

  // Модальное окно
  showModal: boolean = false;
  selectedMasterClass: MasterClass | null = null;

  // Пагинация и бесконечный скролл
  private skip = 0;
  private readonly take = 5;
  hasMore = true;
  isLoading = false;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private authService: AuthService,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer,
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

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  switchToUrl() {
    this.useFileUpload = false;
    this.selectedFile = null;
  }

  switchToFileUpload() {
    this.useFileUpload = true;
    this.newMasterClass.fileUrl = '';
  }

  isImageFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || 
           url.endsWith('.gif') || url.endsWith('.webp') || url.endsWith('.bmp') || 
           url.endsWith('.svg');
  }

  isVideoFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || 
           url.endsWith('.mov') || url.endsWith('.avi') || url.endsWith('.mkv');
  }

  getPreviewUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;
    // Показываем превью только для изображений и видео
    if (this.isImageFile(fileUrl) || this.isVideoFile(fileUrl)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
    }
    return null;
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
      this.resetPagination();
      if (this.username) {
        this.loadPublicMasterClasses();
      } else {
        this.isEditMode = true;
        this.loadOwnMasterClasses();
      }
    });
  }

  private resetPagination() {
    this.skip = 0;
    this.hasMore = true;
    this.masterClasses = [];
  }

  loadPublicMasterClasses(reset = false) {
    if (!this.username || this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getMasterClasses(this.username, this.skip, this.take).subscribe({
      next: (masterClasses) => {
        if (reset) {
          this.masterClasses = masterClasses;
        } else {
          this.masterClasses = [...this.masterClasses, ...masterClasses];
        }

        this.hasMore = masterClasses.length === this.take;
        this.skip += masterClasses.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadOwnMasterClasses(reset = false) {
    if (this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getOwnMasterClasses(this.skip, this.take).subscribe({
      next: (masterClasses) => {
        if (reset) {
          this.masterClasses = masterClasses;
        } else {
          this.masterClasses = [...this.masterClasses, ...masterClasses];
        }

        this.hasMore = masterClasses.length === this.take;
        this.skip += masterClasses.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    if (this.isLoading || !this.hasMore) return;

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = (scrollTop + windowHeight) / documentHeight;

    // Загружаем следующую порцию, когда пользователь прокрутил на 80%
    if (scrollPercent > 0.8) {
      if (this.username) {
        this.loadPublicMasterClasses();
      } else {
        this.loadOwnMasterClasses();
      }
    }
  }

  createMasterClass() {
    if (!this.newMasterClass.title) {
      alert('Пожалуйста, введите заголовок');
      return;
    }

    this.isUploading = true;
    this.continueMasterClassCreation();
  }

  private continueMasterClassCreation() {
    if (this.useFileUpload) {
      if (!this.selectedFile) {
        alert('Пожалуйста, выберите файл для загрузки');
        this.isUploading = false;
        return;
      }
      this.isUploading = true;
      this.uploadService.uploadFile(this.selectedFile).subscribe({
        next: (response) => {
          this.newMasterClass.fileUrl = response.url;
          this.submitMasterClass();
        },
        error: (err) => {
          console.error('Error uploading file:', err);
          this.isUploading = false;
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
          this.isUploading = false;
          this.loadOwnMasterClasses(true);
          this.cancelEdit();
        },
        error: () => {
          this.isUploading = false;
        },
      });
    } else {
      this.teachersService.createMasterClass(this.newMasterClass as any).subscribe({
        next: () => {
          this.isUploading = false;
          this.loadOwnMasterClasses(true);
          this.cancelEdit();
        },
        error: () => {
          this.isUploading = false;
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
      fileUrl: masterClass.fileUrl || '',
      cardColor: masterClass.cardColor || '',
    } as Partial<MasterClass> & { images: string[] };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedFile = null;
    this.useFileUpload = !!masterClass.fileUrl;
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingMasterClassId = null;
    this.newMasterClass = { title: '', description: '', content: '', images: [], fileUrl: '', cardColor: '' } as Partial<MasterClass> & { images: string[] };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedFile = null;
    this.useFileUpload = false;
  }

  getSafeUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    const preview = this.getPreviewUrl(fileUrl);
    if (preview) {
      return (preview as any).changingThisBreaksApplicationSecurity || fileUrl;
    }
    return fileUrl;
  }

  removeCardColor() {
    this.newMasterClass.cardColor = '';
  }

  deleteMasterClass(id: string) {
    if (confirm('Удалить этот мастер-класс?')) {
      this.teachersService.deleteMasterClass(id).subscribe({
        next: () => {
          this.loadOwnMasterClasses(true);
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




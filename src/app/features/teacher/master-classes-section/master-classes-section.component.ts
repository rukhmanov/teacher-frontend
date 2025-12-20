import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { DocxViewerService } from '../../../core/services/docx-viewer.service';
import { MasterClass } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel.component';
import { environment } from '../../../../environments/environment';

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
  showViewerModal: boolean = false;
  viewerFile: string | null = null;
  viewerFileName: string = '';
  viewerError: boolean = false;
  viewerDocxHtml: SafeHtml | null = null;
  isLoadingDocx: boolean = false;
  
  // Превью Word документов
  docxPreviews: Map<string, string> = new Map();
  loadingPreviews: Set<string> = new Set();
  
  // Развернутые карточки
  expandedCards: Set<string> = new Set();

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
    private docxViewerService: DocxViewerService,
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
        
        // Загружаем превью для всех Word документов
        this.loadPreviewsForMasterClasses(masterClasses);
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
        
        // Загружаем превью для всех Word документов
        this.loadPreviewsForMasterClasses(masterClasses);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  /**
   * Загружает превью для всех Word документов в мастер-классах
   */
  private loadPreviewsForMasterClasses(masterClasses: MasterClass[]): void {
    masterClasses.forEach(masterClass => {
      // Загружаем превью для fileUrl
      if (masterClass.fileUrl && this.docxViewerService.isDocxFile(masterClass.fileUrl)) {
        this.loadDocxPreview(masterClass.fileUrl);
      }
      // Загружаем превью для файлов в массиве files
      if (masterClass.files) {
        masterClass.files.forEach(file => {
          if (this.docxViewerService.isDocxFile(file)) {
            this.loadDocxPreview(file);
          }
        });
      }
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

  getFileName(fileUrl: string): string {
    if (!fileUrl) return '';
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || fileUrl;
  }

  getFileIcon(fileUrl: string): string {
    if (!fileUrl) return 'fa-file';
    const url = fileUrl.toLowerCase();
    if (url.endsWith('.pdf')) return 'fa-file-pdf';
    if (url.endsWith('.doc') || url.endsWith('.docx')) return 'fa-file-word';
    if (url.endsWith('.xls') || url.endsWith('.xlsx')) return 'fa-file-excel';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')) return 'fa-file-image';
    return 'fa-file';
  }

  isPdfFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    return fileUrl.toLowerCase().endsWith('.pdf');
  }

  isDocxFile(fileUrl: string): boolean {
    return this.docxViewerService.isDocxFile(fileUrl);
  }

  /**
   * Получает URL для просмотра файла в модальном окне.
   * Для изображений и видео возвращает прямой URL.
   * Для PDF и других файлов использует прокси.
   */
  getViewerUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;

    // Для изображений и видео возвращаем прокси URL, если путь относительный
    if (this.isImageFile(fileUrl) || this.isVideoFile(fileUrl)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.getPreviewUrl(fileUrl));
    }
    // Для PDF используем прокси URL для обхода проблем с CORS (без параметра download для просмотра)
    else if (this.isPdfFile(fileUrl)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.getProxyUrl(fileUrl));
    }
    return null;
  }

  /**
   * Получает URL для превью файла (изображения, видео)
   * Использует прокси для относительных путей, прямой URL для полных
   */
  getPreviewUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    // Если это уже полный URL, возвращаем его
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Иначе, используем прокси
    return this.getProxyUrl(fileUrl);
  }

  /**
   * Получает прокси URL для просмотра файла (без параметра download)
   */
  private getProxyUrl(fileUrl: string): string {
    let relativePath = fileUrl;

    try {
      const url = new URL(fileUrl);
      relativePath = url.pathname.substring(1);
    } catch (e) {
      // Если не удалось распарсить как URL, используем как есть
    }

    // Используем прокси endpoint для просмотра (без download=true)
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(relativePath)}`;
  }

  /**
   * Получает URL для скачивания файла (через прокси с параметром download=true)
   */
  getDownloadUrl(fileUrl: string): string {
    let relativePath = fileUrl;

    try {
      const url = new URL(fileUrl);
      relativePath = url.pathname.substring(1);
    } catch (e) {
      // Если не удалось распарсить как URL, используем как есть
    }

    // Используем прокси endpoint для скачивания с download=true
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(relativePath)}&download=true`;
  }

  canViewInBrowser(fileUrl: string): boolean {
    if (!fileUrl) return false;
    // Поддерживаем изображения, видео, PDF и Word документы (.docx)
    return this.isImageFile(fileUrl) ||
           this.isVideoFile(fileUrl) ||
           this.isPdfFile(fileUrl) ||
           this.docxViewerService.isDocxFile(fileUrl);
  }

  openViewerModal(masterClass: MasterClass): void {
    // Используем fileUrl, если есть, иначе берем первый файл из files
    const fileUrl = masterClass.fileUrl || (masterClass.files && masterClass.files.length > 0 ? masterClass.files[0] : null);
    if (!fileUrl) return;
    this.openViewerModalForFile(fileUrl);
  }

  openViewerModalForFile(fileUrl: string): void {
    if (!fileUrl) return;
    
    this.viewerFile = fileUrl;
    this.viewerFileName = this.getFileName(fileUrl);
    this.viewerError = false;
    this.viewerDocxHtml = null;
    this.isLoadingDocx = false;

    // Если это Word документ (.docx), загружаем и конвертируем его
    if (this.docxViewerService.isDocxFile(fileUrl)) {
      this.isLoadingDocx = true;
      this.docxViewerService.convertDocxToHtml(fileUrl).subscribe({
        next: (html) => {
          this.viewerDocxHtml = this.sanitizer.bypassSecurityTrustHtml(html);
          this.isLoadingDocx = false;
        },
        error: (error) => {
          console.error('Ошибка при конвертации Word документа:', error);
          this.viewerError = true;
          this.isLoadingDocx = false;
        },
      });
    }

    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerFile = null;
    this.viewerFileName = '';
    this.viewerError = false;
    this.viewerDocxHtml = null;
    this.isLoadingDocx = false;
    document.body.style.overflow = '';
  }

  getDocxPreview(fileUrl: string): string | null {
    return this.docxPreviews.get(fileUrl) || null;
  }

  loadDocxPreview(fileUrl: string): void {
    if (!this.docxViewerService.isDocxFile(fileUrl)) {
      return;
    }

    // Если превью уже загружено или загружается, не загружаем снова
    if (this.docxPreviews.has(fileUrl) || this.loadingPreviews.has(fileUrl)) {
      return;
    }

    this.loadingPreviews.add(fileUrl);
    this.docxViewerService.getDocxPreview(fileUrl, 400).subscribe({
      next: (preview) => {
        this.docxPreviews.set(fileUrl, preview);
        this.loadingPreviews.delete(fileUrl);
      },
      error: (error) => {
        console.error('Ошибка при загрузке превью Word документа:', error);
        this.docxPreviews.set(fileUrl, 'Не удалось загрузить превью');
        this.loadingPreviews.delete(fileUrl);
      },
    });
  }

  isLoadingPreview(fileUrl: string): boolean {
    return this.loadingPreviews.has(fileUrl);
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

  isCardExpanded(masterClassId: string): boolean {
    return this.expandedCards.has(masterClassId);
  }

  toggleCardExpansion(masterClassId: string): void {
    if (this.expandedCards.has(masterClassId)) {
      this.expandedCards.delete(masterClassId);
    } else {
      this.expandedCards.add(masterClassId);
    }
  }

  shouldShowExpandButton(masterClass: MasterClass): boolean {
    // Проверяем description или content
    const text = masterClass.description || masterClass.content || '';
    if (!text) return false;
    // Проверяем, что текст достаточно длинный для обрезки (примерно 150+ символов)
    return text.length > 150;
  }

  getTruncatedContent(content: string | undefined): string {
    if (!content) return '';
    return content.length > 200 ? content.substring(0, 200) + '...' : content;
  }

  shouldShowFullButton(masterClass: MasterClass): boolean {
    // Показываем кнопку "Показать все" только если много изображений или есть другие причины открыть модальное окно
    // Но не показываем, если уже есть кнопка развернуть/свернуть
    if (this.shouldShowExpandButton(masterClass)) return false;
    const hasManyImages = !!(masterClass.images && masterClass.images.length > 3);
    return hasManyImages;
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




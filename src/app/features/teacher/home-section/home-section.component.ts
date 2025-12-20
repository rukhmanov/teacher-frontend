import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { DocxViewerService } from '../../../core/services/docx-viewer.service';
import { Post, TeacherProfile } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-home-section',
  standalone: true,
  imports: [CommonModule, FormsModule, ImageCarouselComponent],
  templateUrl: './home-section.component.html',
  styleUrl: './home-section.component.scss',
})
export class HomeSectionComponent implements OnInit {
  posts: Post[] = [];
  teacher: TeacherProfile | null = null;
  username: string = '';
  isEditMode = false;
  showPostForm = false;
  editingPostId: string | null = null;
  newPost = {
    title: '',
    content: '',
    images: [] as string[],
    fileUrl: '',
    cardColor: '',
  };
  
  // Утилита для заглушек
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
  
  // Модальное окно поста
  showPostModal: boolean = false;
  selectedPost: Post | null = null;
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
    private router: Router,
    private teachersService: TeachersService,
    private authService: AuthService,
    private uploadService: UploadService,
    private docxViewerService: DocxViewerService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    // Проверяем, есть ли username в параметрах (публичная страница) или мы в режиме редактирования
    // username находится в родительском роуте для публичных страниц
    const getUsername = () => {
      return this.route.parent?.snapshot?.params?.['username'] || 
             this.route.snapshot?.params?.['username'] || 
             '';
    };
    
    this.username = getUsername();
    
    if (this.username) {
      // Публичная страница - загружаем публичные данные
      this.isEditMode = false;
      this.loadPublicData();
    } else {
      // Страница редактирования - проверяем авторизацию
      if (this.authService.isAuthenticated()) {
        this.isEditMode = true;
        this.loadOwnPosts(true);
        this.loadOwnProfile();
      }
      // Если не авторизован, просто не загружаем данные (guard должен был перенаправить)
    }
    
    // Подписываемся на изменения родительских параметров
    this.route.parent?.params.subscribe((parentParams) => {
      const newUsername = parentParams['username'] || '';
      if (newUsername !== this.username) {
        this.username = newUsername;
        if (this.username) {
          this.isEditMode = false;
          this.loadPublicData();
        }
      }
    });
  }

  private resetPagination() {
    this.skip = 0;
    this.hasMore = true;
    this.posts = [];
  }

  loadPublicData() {
    if (this.username) {
      // Загружаем профиль учителя для отображения информации
      this.teachersService.getTeacherByUsername(this.username).subscribe({
        next: (teacher) => {
          this.teacher = teacher;
        },
        error: (err) => {
          console.error('Error loading teacher:', err);
        },
      });
      // Загружаем публичные посты
      this.resetPagination();
      this.loadPublicPosts(true);
    }
  }

  loadPublicPosts(reset = false) {
    if (!this.username || this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getPosts(this.username, this.skip, this.take).subscribe({
      next: (posts) => {
        if (reset) {
          this.posts = posts;
        } else {
          this.posts = [...this.posts, ...posts];
        }

        this.hasMore = posts.length === this.take;
        this.skip += posts.length;
        this.isLoading = false;
        
        // Загружаем превью для всех Word документов
        this.loadPreviewsForPosts(posts);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadOwnPosts(reset = false) {
    if (this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getOwnPosts(this.skip, this.take).subscribe({
      next: (posts) => {
        if (reset) {
          this.posts = posts;
        } else {
          this.posts = [...this.posts, ...posts];
        }

        this.hasMore = posts.length === this.take;
        this.skip += posts.length;
        this.isLoading = false;
        
        // Загружаем превью для всех Word документов
        this.loadPreviewsForPosts(posts);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  /**
   * Загружает превью для всех Word документов в постах
   */
  private loadPreviewsForPosts(posts: Post[]): void {
    posts.forEach(post => {
      // Загружаем превью для fileUrl
      if (post.fileUrl && this.docxViewerService.isDocxFile(post.fileUrl)) {
        this.loadDocxPreview(post.fileUrl);
      }
      // Загружаем превью для файлов в массиве files
      if (post.files) {
        post.files.forEach(file => {
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
        this.loadPublicPosts(true);
      } else {
        this.loadOwnPosts(true);
      }
    }
  }

  loadOwnProfile() {
    // Загружаем свой профиль только если авторизован
    // Guard должен был проверить авторизацию перед загрузкой компонента
    this.teachersService.getOwnProfile().subscribe({
      next: (teacher) => {
        this.teacher = teacher;
      },
      error: (err) => {
        console.error('Error loading own profile:', err);
        // Interceptor обработает 401 ошибку
      },
    });
  }

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
    this.newPost.fileUrl = '';
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

  openViewerModal(post: Post): void {
    // Используем fileUrl, если есть, иначе берем первый файл из files
    const fileUrl = post.fileUrl || (post.files && post.files.length > 0 ? post.files[0] : null);
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

  getSafeUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    // Используем getPreviewUrl, который теперь возвращает строку
    return this.getPreviewUrl(fileUrl);
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


  removeCardColor() {
    this.newPost.cardColor = '';
  }

  createPost() {
    if (!this.newPost.title) {
      alert('Пожалуйста, введите заголовок');
      return;
    }

    this.isUploading = true;
    this.continuePostCreation();
  }

  private continuePostCreation() {
    if (this.useFileUpload) {
      if (!this.selectedFile) {
        alert('Пожалуйста, выберите файл для загрузки');
        this.isUploading = false;
        return;
      }
      this.isUploading = true;
      this.uploadService.uploadFile(this.selectedFile).subscribe({
        next: (response) => {
          this.newPost.fileUrl = response.url;
          this.submitPost();
        },
        error: (err) => {
          console.error('Error uploading file:', err);
          this.isUploading = false;
          this.submitPost();
        },
      });
    } else {
      this.submitPost();
    }
  }

  private submitPost() {
    if (this.editingPostId) {
      // Обновляем существующий пост
      this.teachersService.updatePost(this.editingPostId, this.newPost).subscribe({
        next: () => {
          this.isUploading = false;
          this.loadOwnPosts(true);
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating post:', err);
          this.isUploading = false;
        },
      });
    } else {
      // Создаем новый пост
      this.teachersService.createPost(this.newPost).subscribe({
        next: () => {
          this.isUploading = false;
          this.loadOwnPosts(true);
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creating post:', err);
          this.isUploading = false;
        },
      });
    }
  }

  editPost(post: Post) {
    this.editingPostId = post.id;
    this.newPost = {
      title: post.title,
      content: post.content,
      images: [...(post.images || [])],
      fileUrl: post.fileUrl || '',
      cardColor: post.cardColor || '',
    };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedFile = null;
    this.useFileUpload = !!post.fileUrl;
    this.showPostForm = true;
  }

  cancelEdit() {
    this.showPostForm = false;
    this.editingPostId = null;
    this.newPost = { title: '', content: '', images: [], fileUrl: '', cardColor: '' };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedFile = null;
    this.useFileUpload = false;
  }

  deletePost(id: string) {
    if (confirm('Удалить этот пост?')) {
      this.teachersService.deletePost(id).subscribe({
        next: () => {
          this.loadOwnPosts(true);
        },
      });
    }
  }

  onImageError(event: Event, type: 'avatar' | 'post' | 'gallery' = 'avatar') {
    const img = event.target as HTMLImageElement;
    if (img) {
      switch (type) {
        case 'avatar':
          img.src = this.placeholder.getAvatarPlaceholder();
          break;
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

  isCardExpanded(postId: string): boolean {
    return this.expandedCards.has(postId);
  }

  toggleCardExpansion(postId: string): void {
    if (this.expandedCards.has(postId)) {
      this.expandedCards.delete(postId);
    } else {
      this.expandedCards.add(postId);
    }
  }

  shouldShowExpandButton(post: Post): boolean {
    if (!post.content) return false;
    // Проверяем, что текст достаточно длинный для обрезки (примерно 150+ символов)
    return post.content.length > 150;
  }

  getTruncatedContent(content: string | undefined): string {
    if (!content) return '';
    const maxLength = 200;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  shouldShowFullButton(post: Post): boolean {
    // Показываем кнопку "Показать все" только если много изображений или есть другие причины открыть модальное окно
    // Но не показываем, если уже есть кнопка развернуть/свернуть
    if (this.shouldShowExpandButton(post)) return false;
    const hasManyImages = !!(post.images && post.images.length > 3);
    return hasManyImages;
  }

  openPostModal(post: Post): void {
    this.selectedPost = post;
    this.showPostModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePostModal(): void {
    this.showPostModal = false;
    this.selectedPost = null;
    document.body.style.overflow = '';
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

  getFullName(teacher: TeacherProfile | null): string {
    if (!teacher) return '';
    const parts = [teacher.firstName, teacher.patronymic, teacher.lastName].filter(p => p);
    return parts.join(' ');
  }
}




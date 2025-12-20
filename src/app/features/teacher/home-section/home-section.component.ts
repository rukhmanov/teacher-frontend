import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
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
    videos: [] as string[],
    files: [] as string[],
    fileUrl: '',
    cardColor: '',
  };
  
  // Утилита для заглушек
  placeholder = PlaceholderUtil;

  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  selectedFiles: File[] = [];
  selectedFile: File | null = null;
  useFileUpload = false;
  isUploading = false;
  
  // Для inline редактирования
  editingPost: Post | null = null;
  
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
      this.selectedFiles = Array.from(input.files);
      this.selectedFile = this.selectedFiles[0]; // Для обратной совместимости
    }
  }
  
  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
    if (this.selectedFiles.length > 0) {
      this.selectedFile = this.selectedFiles[0];
    } else {
      this.selectedFile = null;
    }
  }
  
  removeFileFromPost(postId: string, fileUrl: string, type: 'image' | 'video' | 'file') {
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;
    
    // Обновляем локальное состояние
    if (type === 'image' && post.images) {
      post.images = post.images.filter(img => img !== fileUrl);
    } else if (type === 'video' && post.videos) {
      post.videos = post.videos.filter(vid => vid !== fileUrl);
    } else if (type === 'file' && post.files) {
      post.files = post.files.filter(f => f !== fileUrl);
    }
    
    // Если файл был в fileUrl, очищаем его
    if (post.fileUrl === fileUrl) {
      post.fileUrl = '';
    }
    
    // Обновляем редактируемый пост, если он открыт
    if (this.editingPost && this.editingPost.id === postId) {
      if (type === 'image' && this.editingPost.images) {
        this.editingPost.images = this.editingPost.images.filter(img => img !== fileUrl);
      } else if (type === 'video' && this.editingPost.videos) {
        this.editingPost.videos = this.editingPost.videos.filter(vid => vid !== fileUrl);
      } else if (type === 'file' && this.editingPost.files) {
        this.editingPost.files = this.editingPost.files.filter(f => f !== fileUrl);
      }
      if (this.editingPost.fileUrl === fileUrl) {
        this.editingPost.fileUrl = '';
      }
    }
    
    // Обновляем пост на сервере
    const updateData: any = {};
    if (type === 'image') updateData.images = post.images || [];
    if (type === 'video') updateData.videos = post.videos || [];
    if (type === 'file') updateData.files = post.files || [];
    if (post.fileUrl === '') updateData.fileUrl = '';
    
    this.teachersService.updatePost(postId, updateData).subscribe({
      next: () => {
        this.loadOwnPosts(true);
      },
      error: (err) => {
        console.error('Error removing file:', err);
        // Восстанавливаем состояние при ошибке
        this.loadOwnPosts(true);
      },
    });
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
  
  isPptxFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.pptx') || url.endsWith('.ppt');
  }
  
  getMediaItems(post: Post): Array<{type: 'photo' | 'video', url: string}> {
    const items: Array<{type: 'photo' | 'video', url: string}> = [];
    if (post.images) {
      post.images.forEach(img => items.push({ type: 'photo', url: img }));
    }
    if (post.videos) {
      post.videos.forEach(vid => items.push({ type: 'video', url: vid }));
    }
    // Также проверяем fileUrl, если это изображение или видео
    if (post.fileUrl) {
      if (this.isImageFile(post.fileUrl)) {
        items.push({ type: 'photo', url: post.fileUrl });
      } else if (this.isVideoFile(post.fileUrl)) {
        items.push({ type: 'video', url: post.fileUrl });
      }
    }
    return items;
  }
  
  getOtherFiles(post: Post): string[] {
    const files: string[] = [];
    if (post.files) {
      files.push(...post.files.filter(f => f != null && f !== ''));
    }
    // fileUrl добавляем только если это не изображение и не видео
    if (post.fileUrl && !this.isImageFile(post.fileUrl) && !this.isVideoFile(post.fileUrl)) {
      files.push(post.fileUrl);
    }
    return files;
  }
  
  /**
   * Получить все файлы поста (изображения, видео и другие файлы)
   */
  getAllFiles(post: Post): string[] {
    const allFiles: string[] = [];
    
    // Добавляем изображения
    if (post.images) {
      allFiles.push(...post.images.filter(img => img != null && img !== ''));
    }
    
    // Добавляем видео
    if (post.videos) {
      allFiles.push(...post.videos.filter(vid => vid != null && vid !== ''));
    }
    
    // Добавляем другие файлы
    if (post.files) {
      allFiles.push(...post.files.filter(f => f != null && f !== ''));
    }
    
    // Добавляем fileUrl, если он есть
    if (post.fileUrl && post.fileUrl.trim() !== '') {
      allFiles.push(post.fileUrl);
    }
    
    return allFiles;
  }
  
  getPhotoUrls(post: Post): string[] {
    return this.getMediaItems(post)
      .filter(item => item.type === 'photo')
      .map(item => item.url);
  }
  
  getPhotoIndex(post: Post, mediaItem: {type: 'photo' | 'video', url: string}): number {
    // Возвращаем индекс только среди фото
    const photoUrls = this.getPhotoUrls(post);
    return photoUrls.indexOf(mediaItem.url);
  }

  getFileName(fileUrl: string): string {
    if (!fileUrl) return '';
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || fileUrl;
  }
  
  /**
   * Определяет тип файла для удаления
   */
  getFileType(fileUrl: string): 'image' | 'video' | 'file' {
    if (this.isImageFile(fileUrl)) {
      return 'image';
    } else if (this.isVideoFile(fileUrl)) {
      return 'video';
    } else {
      return 'file';
    }
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

  isDocxFile(fileUrl: string | undefined): boolean {
    if (!fileUrl) return false;
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
    // Для PPTX используем Office Online Viewer (пока без локального решения)
    else if (this.isPptxFile(fileUrl)) {
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(this.getPreviewUrl(fileUrl))}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl);
    }
    return null;
  }

  /**
   * Получает URL для превью файла (изображения, видео)
   * Всегда использует прокси для обхода проблем с CORS
   * Бэкенд автоматически извлекает относительный путь из полного URL
   */
  getPreviewUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    // Всегда используем прокси - бэкенд сам извлечет относительный путь из полного URL
    return this.getProxyUrl(fileUrl);
  }

  /**
   * Получает прокси URL для просмотра файла (без параметра download)
   */
  private getProxyUrl(fileUrl: string): string {
    // Передаем URL как есть (может быть полным или относительным)
    // Бэкенд сам извлечет относительный путь через FilePathUtil.extractRelativePath
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(fileUrl)}`;
  }

  /**
   * Получает URL для скачивания файла (через прокси с параметром download=true)
   */
  getDownloadUrl(fileUrl: string): string {
    // Если это полный URL (внешний), передаем его целиком в прокси
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(fileUrl)}&download=true`;
    }
    
    // Для относительных путей используем как есть
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(fileUrl)}&download=true`;
  }

  canViewInBrowser(fileUrl: string): boolean {
    if (!fileUrl) return false;
    // Поддерживаем изображения, видео, PDF, Word документы (.docx) и PowerPoint (.pptx)
    return this.isImageFile(fileUrl) ||
           this.isVideoFile(fileUrl) ||
           this.isPdfFile(fileUrl) ||
           this.docxViewerService.isDocxFile(fileUrl) ||
           this.isPptxFile(fileUrl);
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

  getDocxPreview(fileUrl: string | undefined): string | null {
    if (!fileUrl) return null;
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

  isLoadingPreview(fileUrl: string | undefined): boolean {
    if (!fileUrl) return false;
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
    if (this.useFileUpload && this.selectedFiles.length > 0) {
      this.isUploading = true;
      
      // Загружаем все файлы параллельно
      const uploadObservables = this.selectedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return this.uploadService.uploadImage(file).pipe(
            map(response => ({ type: 'image' as const, url: response.url }))
          );
        } else if (file.type.startsWith('video/')) {
          return this.uploadService.uploadFile(file).pipe(
            map(response => ({ type: 'video' as const, url: response.url }))
          );
        } else {
          return this.uploadService.uploadFile(file).pipe(
            map(response => ({ type: 'file' as const, url: response.url }))
          );
        }
      });
      
      forkJoin(uploadObservables).subscribe({
        next: (results) => {
          // Разделяем файлы по типам
          const images: string[] = [];
          const videos: string[] = [];
          const files: string[] = [];
          
          results.forEach(result => {
            if (result.type === 'image') {
              images.push(result.url);
            } else if (result.type === 'video') {
              videos.push(result.url);
            } else {
              files.push(result.url);
            }
          });
          
          // Если только один файл, используем fileUrl для обратной совместимости
          if (results.length === 1 && results[0].type === 'file') {
            this.newPost.fileUrl = results[0].url;
          } else {
            // Иначе используем массивы
            this.newPost.images = [...(this.newPost.images || []), ...images];
            this.newPost.videos = [...(this.newPost.videos || []), ...videos];
            this.newPost.files = [...(this.newPost.files || []), ...files];
          }
          
          this.submitPost();
        },
        error: (err) => {
          console.error('Error uploading files:', err);
          this.isUploading = false;
          alert('Ошибка при загрузке файлов');
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
    // Переключаемся в режим inline редактирования
    this.editingPostId = post.id;
    this.editingPost = { ...post };
    this.cancelEdit(); // Закрываем форму, если открыта
  }
  
  startInlineEdit(post: Post) {
    this.editingPostId = post.id;
    this.editingPost = { ...post };
  }
  
  cancelInlineEdit() {
    this.editingPostId = null;
    this.editingPost = null;
    this.loadOwnPosts(true); // Перезагружаем для восстановления исходных данных
  }
  
  saveInlineEdit() {
    if (!this.editingPost || !this.editingPostId) return;
    
    if (!this.editingPost.title) {
      alert('Пожалуйста, введите заголовок');
      return;
    }
    
    this.isUploading = true;
    
    // Загружаем новые файлы, если есть
    if (this.selectedFiles.length > 0) {
      const uploadObservables = this.selectedFiles.map(file => {
        if (file.type.startsWith('image/')) {
          return this.uploadService.uploadImage(file).pipe(
            map(response => ({ type: 'image' as const, url: response.url }))
          );
        } else if (file.type.startsWith('video/')) {
          return this.uploadService.uploadFile(file).pipe(
            map(response => ({ type: 'video' as const, url: response.url }))
          );
        } else {
          return this.uploadService.uploadFile(file).pipe(
            map(response => ({ type: 'file' as const, url: response.url }))
          );
        }
      });
      
      forkJoin(uploadObservables).subscribe({
        next: (results) => {
          const images: string[] = [];
          const videos: string[] = [];
          const files: string[] = [];
          
          results.forEach(result => {
            if (result.type === 'image') {
              images.push(result.url);
            } else if (result.type === 'video') {
              videos.push(result.url);
            } else {
              files.push(result.url);
            }
          });
          
          this.editingPost!.images = [...(this.editingPost!.images || []), ...images];
          this.editingPost!.videos = [...(this.editingPost!.videos || []), ...videos];
          this.editingPost!.files = [...(this.editingPost!.files || []), ...files];
          
          this.submitInlineEdit();
        },
        error: (err) => {
          console.error('Error uploading files:', err);
          this.isUploading = false;
          alert('Ошибка при загрузке файлов');
        },
      });
    } else {
      this.submitInlineEdit();
    }
  }
  
  submitInlineEdit() {
    if (!this.editingPost || !this.editingPostId) return;
    
    const updateData: any = {
      title: this.editingPost.title,
      content: this.editingPost.content,
      cardColor: this.editingPost.cardColor || '',
    };
    
    if (this.editingPost.images) updateData.images = this.editingPost.images;
    if (this.editingPost.videos) updateData.videos = this.editingPost.videos;
    if (this.editingPost.files) updateData.files = this.editingPost.files;
    if (this.editingPost.fileUrl) updateData.fileUrl = this.editingPost.fileUrl;
    
    this.teachersService.updatePost(this.editingPostId, updateData).subscribe({
      next: () => {
        this.isUploading = false;
        this.selectedFiles = [];
        this.selectedFile = null;
        this.cancelInlineEdit();
      },
      error: (err) => {
        console.error('Error updating post:', err);
        this.isUploading = false;
      },
    });
  }

  cancelEdit() {
    this.showPostForm = false;
    if (!this.editingPost) {
      this.editingPostId = null;
    }
    this.newPost = { title: '', content: '', images: [], videos: [], files: [], fileUrl: '', cardColor: '' };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.selectedFiles = [];
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
      // Предотвращаем бесконечный цикл - если уже placeholder, не заменяем
      if (img.src && img.src.startsWith('data:image/svg+xml')) {
        return;
      }
      
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

  /**
   * Обработчик загрузки метаданных видео - устанавливает первый кадр
   */
  onVideoLoaded(event: Event): void {
    const video = event.target as HTMLVideoElement;
    if (video && video.readyState >= 1) {
      // Устанавливаем время на первый кадр для показа постера
      video.currentTime = 0.1;
      // Предотвращаем автовоспроизведение
      video.pause();
    }
  }

  /**
   * TrackBy функция для оптимизации рендеринга списка медиа-элементов
   */
  trackByMediaItem(index: number, item: {type: 'photo' | 'video', url: string}): string {
    return item.url;
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
    if (!url || url.trim() === '') {
      return PlaceholderUtil.getImageUrl(null, type);
    }
    // Используем getPreviewUrl для получения правильного URL через прокси
    const previewUrl = this.getPreviewUrl(url);
    // Если previewUrl пустой, возвращаем placeholder
    if (!previewUrl || previewUrl.trim() === '') {
      return PlaceholderUtil.getImageUrl(null, type);
    }
    return PlaceholderUtil.getImageUrl(previewUrl, type);
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




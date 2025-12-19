import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
import { Post, TeacherProfile } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { ImageCarouselComponent } from '../../../shared/components/image-carousel/image-carousel.component';

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
  viewerPost: Post | null = null;
  
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

  getPreviewUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;
    // Показываем превью только для изображений и видео
    if (this.isImageFile(fileUrl) || this.isVideoFile(fileUrl)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(fileUrl);
    }
    return null;
  }

  getViewerUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;
    
    const url = fileUrl.toLowerCase();
    let viewerUrl: string | null = null;
    
    // Для изображений и видео возвращаем прямой URL
    if (this.isImageFile(fileUrl) || this.isVideoFile(fileUrl)) {
      viewerUrl = fileUrl;
    }
    // Для Word документов используем Office Online Viewer
    else if (url.endsWith('.doc') || url.endsWith('.docx')) {
      viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
    // Для PPTX/PPT используем Office Online Viewer
    else if (url.endsWith('.pptx') || url.endsWith('.ppt')) {
      viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
    // Для PDF используем Google Docs Viewer
    else if (url.endsWith('.pdf')) {
      viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    
    return viewerUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl) : null;
  }

  canViewInBrowser(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    // Поддерживаем изображения, видео, Word документы, PDF, PPTX/PPT
    return this.isImageFile(fileUrl) || this.isVideoFile(fileUrl) ||
           url.endsWith('.doc') || url.endsWith('.docx') || 
           url.endsWith('.pdf') || 
           url.endsWith('.pptx') || url.endsWith('.ppt');
  }

  openViewerModal(post: Post): void {
    this.viewerPost = post;
    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerPost = null;
    document.body.style.overflow = '';
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




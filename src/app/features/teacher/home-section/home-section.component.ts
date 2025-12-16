import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
    videos: [] as string[],
    cardColor: '',
  };
  
  // Утилита для заглушек
  placeholder = PlaceholderUtil;

  selectedImages: File[] = [];
  imagePreviews: string[] = [];
  
  // Карусель изображений
  showCarousel: boolean = false;
  carouselImages: string[] = [];
  carouselStartIndex: number = 0;
  
  // Модальное окно поста
  showPostModal: boolean = false;
  selectedPost: Post | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teachersService: TeachersService,
    private authService: AuthService,
    private uploadService: UploadService,
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
        this.loadOwnPosts();
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
      this.teachersService.getPosts(this.username).subscribe({
        next: (posts) => {
          this.posts = posts;
        },
        error: (err) => {
          console.error('Error loading posts:', err);
        },
      });
    }
  }

  loadPublicPosts() {
    if (this.username) {
      this.teachersService.getPosts(this.username).subscribe({
        next: (posts) => {
          this.posts = posts;
        },
      });
    }
  }

  loadOwnPosts() {
    this.teachersService.getOwnPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
      },
    });
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


  removeCardColor() {
    this.newPost.cardColor = '';
  }

  createPost() {
    this.continuePostCreation();
  }

  private continuePostCreation() {
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
          this.newPost.images = [...(this.newPost.images || []), ...newImageUrls];
          this.submitPost();
        },
        error: (err) => {
          console.error('Error uploading images:', err);
          this.submitPost();
        }
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
          this.loadOwnPosts();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error updating post:', err);
        },
      });
    } else {
      // Создаем новый пост
      this.teachersService.createPost(this.newPost).subscribe({
        next: () => {
          this.loadOwnPosts();
          this.cancelEdit();
        },
        error: (err) => {
          console.error('Error creating post:', err);
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
      videos: [...(post.videos || [])],
      cardColor: post.cardColor || '',
    };
    this.selectedImages = [];
    this.imagePreviews = [];
    this.showPostForm = true;
  }

  cancelEdit() {
    this.showPostForm = false;
    this.editingPostId = null;
    this.newPost = { title: '', content: '', images: [], videos: [], cardColor: '' };
    this.selectedImages = [];
    this.imagePreviews = [];
  }

  deletePost(id: string) {
    if (confirm('Удалить этот пост?')) {
      this.teachersService.deletePost(id).subscribe({
        next: () => {
          this.loadOwnPosts();
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

  getTruncatedContent(content: string | undefined): string {
    if (!content) return '';
    const maxLength = 200;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }

  shouldShowFullButton(post: Post): boolean {
    // Показываем кнопку, если контент длинный или много изображений
    const hasLongContent = !!(post.content && post.content.length > 200);
    const hasManyImages = !!(post.images && post.images.length > 3);
    return hasLongContent || hasManyImages;
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
}


import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post, TeacherProfile } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-home-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-section.component.html',
  styleUrl: './home-section.component.scss',
})
export class HomeSectionComponent implements OnInit {
  posts: Post[] = [];
  teacher: TeacherProfile | null = null;
  username: string = '';
  isEditMode = false;
  showPostForm = false;
  newPost = {
    title: '',
    content: '',
    images: [] as string[],
    videos: [] as string[],
  };
  
  // Утилита для заглушек
  placeholder = PlaceholderUtil;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teachersService: TeachersService,
    private authService: AuthService,
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

  createPost() {
    this.teachersService.createPost(this.newPost).subscribe({
      next: () => {
        this.loadOwnPosts();
        this.showPostForm = false;
        this.newPost = { title: '', content: '', images: [], videos: [] };
      },
    });
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
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, RouterOutlet } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { TeacherProfile } from '../../../core/models/teacher.interface';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-teacher-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, HeaderComponent],
  templateUrl: './teacher-profile.component.html',
  styleUrl: './teacher-profile.component.scss',
})
export class TeacherProfileComponent implements OnInit {
  teacher: TeacherProfile | null = null;
  username: string = '';
  activeSection: string = 'home';
  placeholder = PlaceholderUtil;
  isOwnProfile = false;
  currentUsername: string = '';
  isVideoExpanded: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teachersService: TeachersService,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    // Получаем username текущего пользователя
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user) {
        this.currentUsername = user.username;
      }
    }

    this.route.params.subscribe((params) => {
      this.username = params['username'];
      this.isOwnProfile = this.username === this.currentUsername;
      this.loadTeacher();
    });

    this.route.firstChild?.url.subscribe((segments) => {
      if (segments && segments.length > 0) {
        this.activeSection = segments[0].path;
      } else {
        this.activeSection = 'home';
      }
    });
  }

  loadTeacher() {
    this.teachersService.getTeacherByUsername(this.username).subscribe({
      next: (teacher) => {
        this.teacher = teacher;
      },
      error: (err) => {
        console.error('Error loading teacher:', err);
      },
    });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholder.getAvatarPlaceholder();
    }
  }

  goToEditProfile() {
    this.router.navigate(['/me/profile']);
  }

  getFullName(teacher: TeacherProfile | null): string {
    if (!teacher) return '';
    const parts = [teacher.firstName, teacher.patronymic, teacher.lastName].filter(p => p);
    return parts.join(' ');
  }

  isVideoUrl(url: string | undefined): boolean {
    if (!url) return false;
    const videoUrl = url.toLowerCase();
    // Проверяем, является ли это URL видеохостинга (не прямой файл)
    return (videoUrl.includes('youtube.com') || 
           videoUrl.includes('youtu.be') || 
           videoUrl.includes('vimeo.com')) &&
           !this.isDirectVideoFile(url);
  }

  isDirectVideoFile(url: string | undefined): boolean {
    if (!url) return false;
    const videoUrl = url.toLowerCase();
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
    return videoExtensions.some(ext => videoUrl.endsWith(ext)) || 
           videoUrl.includes('/video/') && !videoUrl.includes('youtube.com') && !videoUrl.includes('vimeo.com');
  }

  isYouTubeUrl(url: string | undefined): boolean {
    if (!url) return false;
    const videoUrl = url.toLowerCase();
    return videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  }

  isVimeoUrl(url: string | undefined): boolean {
    if (!url) return false;
    return url.toLowerCase().includes('vimeo.com');
  }

  getYouTubeEmbedUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    
    let videoId = '';
    
    // Обработка различных форматов YouTube URL
    if (url.includes('youtube.com/watch?v=')) {
      videoId = url.split('v=')[1]?.split('&')[0] || '';
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
    } else if (url.includes('youtube.com/embed/')) {
      videoId = url.split('embed/')[1]?.split('?')[0] || '';
    }
    
    if (!videoId) return null;
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  getVimeoEmbedUrl(url: string): SafeResourceUrl | null {
    if (!url) return null;
    
    let videoId = '';
    
    // Обработка различных форматов Vimeo URL
    if (url.includes('vimeo.com/')) {
      const match = url.match(/vimeo\.com\/(\d+)/);
      videoId = match ? match[1] : '';
    }
    
    if (!videoId) return null;
    
    const embedUrl = `https://player.vimeo.com/video/${videoId}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
  }

  toggleVideo() {
    this.isVideoExpanded = !this.isVideoExpanded;
  }
}




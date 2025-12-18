import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Review, CreateReviewRequest } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-reviews-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews-section.component.html',
  styleUrl: './reviews-section.component.scss',
})
export class ReviewsSectionComponent implements OnInit {
  reviews: Review[] = [];
  username: string = '';
  isEditMode = false;
  showReviewForm = false;
  newReview: CreateReviewRequest = {
    authorName: '',
    authorEmail: '',
    content: '',
    rating: 5,
  };
  isSubmitting = false;
  error: string = '';
  success: string = '';
  placeholder = PlaceholderUtil;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Проверяем, есть ли username в параметрах (публичная страница) или мы в режиме редактирования
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'] || '';
      if (this.username) {
        // Публичная страница
        this.isEditMode = false;
        this.loadReviews();
      } else {
        // Страница редактирования - получаем username текущего пользователя
        this.isEditMode = true;
        const user = this.authService.getCurrentUser();
        if (user) {
          this.username = user.username;
          this.loadReviews();
        }
      }
    });
  }

  loadReviews() {
    if (this.username) {
      this.teachersService.getReviews(this.username).subscribe({
        next: (reviews) => {
          this.reviews = reviews;
        },
        error: (err) => {
          console.error('Error loading reviews:', err);
        },
      });
    }
  }

  submitReview() {
    if (!this.newReview.authorName.trim() || !this.newReview.content.trim() || !this.newReview.authorEmail.trim()) {
      this.error = 'Пожалуйста, заполните все обязательные поля';
      return;
    }

    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newReview.authorEmail.trim())) {
      this.error = 'Пожалуйста, введите корректный email адрес';
      return;
    }

    this.isSubmitting = true;
    this.error = '';
    this.success = '';

    this.teachersService.createReview(this.username, this.newReview).subscribe({
      next: () => {
        this.success = 'Отзыв успешно добавлен!';
        this.newReview = {
          authorName: '',
          authorEmail: '',
          content: '',
          rating: 5,
        };
        this.showReviewForm = false;
        this.loadReviews();
        setTimeout(() => {
          this.success = '';
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Ошибка при добавлении отзыва';
        this.isSubmitting = false;
      },
      complete: () => {
        this.isSubmitting = false;
      },
    });
  }

  setRating(rating: number) {
    this.newReview.rating = rating;
  }

  getStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < rating);
  }

  formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  deleteReview(reviewId: string) {
    if (confirm('Удалить этот отзыв?')) {
      this.teachersService.deleteReview(reviewId).subscribe({
        next: () => {
          this.loadReviews();
        },
        error: (err) => {
          console.error('Error deleting review:', err);
          alert('Ошибка при удалении отзыва');
        },
      });
    }
  }

  getAvatarPlaceholder(authorName: string): string {
    // Создаем заглушку с инициалами автора
    const initials = this.getInitials(authorName);
    const colors = [
      ['#ff9a9e', '#fecfef'],
      ['#a8edea', '#fed6e3'],
      ['#ffecd2', '#fcb69f'],
      ['#ff9a9e', '#fad0c4'],
      ['#a1c4fd', '#c2e9fb'],
    ];
    const colorIndex = authorName.length % colors.length;
    const [color1, color2] = colors[colorIndex];
    
    // Используем encodeURIComponent для правильной обработки Unicode символов
    const svgContent = `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="avatarGrad${authorName.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#avatarGrad${authorName.replace(/\s/g, '').replace(/[^a-zA-Z0-9]/g, '')})"/>
        <text x="100" y="120" font-family="Arial, sans-serif" font-size="60" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">${this.escapeXml(initials)}</text>
      </svg>
    `.trim();
    
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
  }

  escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].charAt(0).toUpperCase();
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  onAvatarError(event: Event, authorName: string) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.getAvatarPlaceholder(authorName);
    }
  }
}

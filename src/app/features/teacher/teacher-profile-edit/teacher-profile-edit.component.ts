import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { TeacherProfile, SocialLink, SocialPlatform } from '../../../core/models/teacher.interface';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { AddressMapComponent } from '../../../shared/components/address-map/address-map.component';

@Component({
  selector: 'app-teacher-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, AddressMapComponent, RouterOutlet],
  templateUrl: './teacher-profile-edit.component.html',
  styleUrl: './teacher-profile-edit.component.scss',
})
export class TeacherProfileEditComponent implements OnInit {
  profile: TeacherProfile | null = null;
  socialLinks: SocialLink[] = [];
  activeSection: string = 'profile';
  socialPlatforms = Object.values(SocialPlatform);
  newSocialLink: Partial<SocialLink> = {
    platform: SocialPlatform.VK,
    url: '',
  };
  placeholder = PlaceholderUtil;
  isAddressValid: boolean = false; // Флаг валидности адреса

  router = inject(Router);

  constructor(
    private teachersService: TeachersService,
    private uploadService: UploadService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // Проверяем авторизацию перед загрузкой данных
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
      return;
    }
    this.loadProfile();
    this.loadSocialLinks();
    
    // Инициализируем валидность адреса
    this.isAddressValid = false;
  }

  loadProfile() {
    // Дополнительная проверка авторизации
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/']);
      return;
    }
    
    this.teachersService.getOwnProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        // Если уже есть сохраненный адрес, считаем его валидным
        if (profile?.location) {
          this.isAddressValid = true;
        }
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/']);
        } else if (err.status === 404) {
          // Если профиль не найден (404), создаем пустой профиль для редактирования
          const user = this.authService.getCurrentUser();
          this.profile = {
            id: '',
            userId: user?.id || '',
            firstName: '',
            lastName: '',
            patronymic: '',
            bio: '',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }
      },
    });
  }

  loadSocialLinks() {
    // Дополнительная проверка авторизации
    if (!this.authService.isAuthenticated()) {
      return;
    }
    
    this.teachersService.getOwnSocialLinks().subscribe({
      next: (links) => {
        this.socialLinks = links;
      },
      error: (err) => {
        console.error('Error loading social links:', err);
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/']);
        }
      },
    });
  }

  updateProfile() {
    if (this.profile) {
      this.saveProfile();
    }
  }

  onAddressSelected(event: { address: string; coordinates?: { lat: number; lon: number }; fullData?: any }) {
    if (this.profile) {
      this.profile.location = event.address;
      
      // Сохраняем координаты, если они есть
      if (event.coordinates) {
        this.profile.latitude = event.coordinates.lat;
        this.profile.longitude = event.coordinates.lon;
      }
    }
  }

  onAddressValid(isValid: boolean) {
    this.isAddressValid = isValid;
  }

  clearLocation() {
    if (this.profile) {
      this.profile.location = '';
      this.profile.latitude = undefined;
      this.profile.longitude = undefined;
      this.isAddressValid = false;
    }
  }

  private saveProfile() {
    if (this.profile) {
      this.teachersService.updateProfile(this.profile).subscribe({
        next: () => {
          alert('Профиль обновлен');
        },
      });
    }
  }


  onPhotoUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.uploadService.uploadImage(file).subscribe({
        next: (response) => {
          if (this.profile) {
            this.profile.photoUrl = response.url;
          }
        },
      });
    }
  }

  addSocialLink() {
    // Форматируем URL для телеграм
    const formattedLink = { ...this.newSocialLink };
    if (formattedLink.platform === SocialPlatform.TELEGRAM && formattedLink.url) {
      formattedLink.url = this.formatTelegramUrl(formattedLink.url);
    }

    this.teachersService.addSocialLink(formattedLink as any).subscribe({
      next: () => {
        this.loadSocialLinks();
        this.newSocialLink = { platform: SocialPlatform.VK, url: '' };
      },
      error: (err) => {
        console.error('Error adding social link:', err);
      },
    });
  }

  private formatTelegramUrl(url: string): string {
    if (!url) return url;
    
    const trimmedUrl = url.trim();
    
    // Если URL уже начинается с http/https, возвращаем как есть
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    
    // Убираем @ если есть
    const username = trimmedUrl.replace(/^@/, '');
    
    // Формируем правильный URL
    return `https://t.me/${username}`;
  }

  deleteSocialLink(id: string) {
    if (confirm('Удалить эту ссылку?')) {
      this.teachersService.deleteSocialLink(id).subscribe({
        next: () => {
          this.loadSocialLinks();
        },
      });
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholder.getAvatarPlaceholder();
    }
  }

  getPlatformName(platform: SocialPlatform): string {
    const names: Record<SocialPlatform, string> = {
      [SocialPlatform.VK]: 'ВКонтакте',
      [SocialPlatform.TELEGRAM]: 'Telegram',
      [SocialPlatform.WEBSITE]: 'Сайт',
      [SocialPlatform.MESSENGER_MAX]: 'Messenger Max',
    };
    return names[platform] || platform;
  }

  onMapLocationSelect = (lat: number, lon: number, address?: string) => {
    if (this.profile) {
      this.profile.latitude = lat;
      this.profile.longitude = lon;
      // Обновляем адрес, если он был получен через обратное геокодирование
      if (address && !this.profile.location) {
        this.profile.location = address;
      }
    }
  }

  isProfilePage(): boolean {
    const url = this.router.url;
    return url.includes('/me/profile') || url === '/me' || url === '/me/';
  }

  deleteProfile() {
    const confirmed = confirm(
      'Вы уверены, что хотите удалить свой профиль? Это действие нельзя отменить. Все ваши данные (посты, мастер-классы, презентации и т.д.) будут безвозвратно удалены.'
    );
    
    if (confirmed) {
      const doubleConfirm = confirm(
        'Это последнее предупреждение! Вы действительно хотите удалить свой профиль?'
      );
      
      if (doubleConfirm) {
        this.teachersService.deleteProfile().subscribe({
          next: () => {
            alert('Профиль успешно удален');
            this.authService.logout();
            this.router.navigate(['/']);
          },
          error: (err) => {
            console.error('Error deleting profile:', err);
            alert('Произошла ошибка при удалении профиля');
          },
        });
      }
    }
  }
}




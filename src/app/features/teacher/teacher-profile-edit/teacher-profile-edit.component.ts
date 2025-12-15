import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { TeacherProfile, SocialLink, SocialPlatform } from '../../../core/models/teacher.interface';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { YandexMapComponent } from '../../../shared/components/yandex-map/yandex-map.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-teacher-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent, YandexMapComponent],
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

  constructor(
    private teachersService: TeachersService,
    private uploadService: UploadService,
    private router: Router,
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
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        if (err.status === 401) {
          this.authService.logout();
          this.router.navigate(['/']);
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
      // Если есть адрес, но нет координат, пытаемся получить координаты
      if (this.profile.location && (!this.profile.latitude || !this.profile.longitude)) {
        this.geocodeAddress(this.profile.location);
      } else {
        this.saveProfile();
      }
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

  private geocodeAddress(address: string) {
    // Загружаем Яндекс карты API если еще не загружен
    if (typeof (window as any).ymaps === 'undefined') {
      // Проверяем, не загружается ли уже скрипт
      if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
        // Ждем загрузки существующего скрипта
        const checkInterval = setInterval(() => {
          if (typeof (window as any).ymaps !== 'undefined') {
            clearInterval(checkInterval);
            this.performGeocode(address);
          }
        }, 100);
        return;
      }

      const apiKey = environment.yandexMapsApiKey;
      const script = document.createElement('script');
      script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
      script.async = true;
      script.onload = () => {
        this.performGeocode(address);
      };
      document.head.appendChild(script);
    } else {
      this.performGeocode(address);
    }
  }

  private performGeocode(address: string) {
    if (typeof (window as any).ymaps === 'undefined') {
      this.saveProfile();
      return;
    }

    (window as any).ymaps.ready(() => {
      (window as any).ymaps.geocode(address, {
        results: 1
      }).then((res: any) => {
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject && this.profile) {
          const coords = firstGeoObject.geometry.getCoordinates();
          this.profile.latitude = coords[0];
          this.profile.longitude = coords[1];
        }
        this.saveProfile();
      }).catch(() => {
        // Если геокодирование не удалось, сохраняем без координат
        this.saveProfile();
      });
    });
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
}

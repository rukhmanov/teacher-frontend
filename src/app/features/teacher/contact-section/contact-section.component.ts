import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TeachersService } from '../../../core/services/teachers.service';
import { TeacherProfile, SocialLink, SocialPlatform } from '../../../core/models/teacher.interface';
import { AddressMapComponent } from '../../../shared/components/address-map/address-map.component';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [CommonModule, AddressMapComponent],
  templateUrl: './contact-section.component.html',
  styleUrl: './contact-section.component.scss',
})
export class ContactSectionComponent implements OnInit {
  teacher: TeacherProfile | null = null;
  socialLinks: SocialLink[] = [];
  username: string = '';

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
  ) {}

  ngOnInit() {
    // username находится в родительском роуте для публичных страниц
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicData();
      } else {
        // Страница редактирования - загружаем свои данные (guard должен проверить авторизацию)
        this.loadOwnData();
      }
    });
  }

  loadPublicData() {
    if (this.username) {
      this.teachersService.getTeacherByUsername(this.username).subscribe({
        next: (teacher) => {
          this.teacher = teacher;
        },
      });
      this.teachersService.getSocialLinks(this.username).subscribe({
        next: (links) => {
          this.socialLinks = links;
        },
      });
    }
  }

  loadOwnData() {
    // Загружаем свои данные только если авторизован
    // Если не авторизован, не загружаем ничего (это должно быть защищено роутом)
    this.teachersService.getOwnProfile().subscribe({
      next: (teacher) => {
        this.teacher = teacher;
      },
      error: (err) => {
        console.error('Error loading own profile:', err);
      },
    });
    this.teachersService.getOwnSocialLinks().subscribe({
      next: (links) => {
        this.socialLinks = links;
      },
      error: (err) => {
        console.error('Error loading own social links:', err);
      },
    });
  }

  getSocialIcon(platform: SocialPlatform): string {
    const icons: Record<SocialPlatform, string> = {
      [SocialPlatform.VK]: 'fab fa-vk',
      [SocialPlatform.TELEGRAM]: 'fab fa-telegram',
      [SocialPlatform.WEBSITE]: 'fas fa-globe',
      [SocialPlatform.MESSENGER_MAX]: 'fab fa-facebook-messenger',
    };
    return icons[platform] || 'fas fa-link';
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

  getSocialLinkUrl(link: SocialLink): string {
    if (link.platform === SocialPlatform.TELEGRAM) {
      // Если это телеграм, форматируем URL
      let url = link.url.trim();
      
      // Если URL не начинается с http/https, это username
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Убираем @ если есть
        url = url.replace(/^@/, '');
        // Формируем правильный URL
        return `https://t.me/${url}`;
      }
      
      // Если уже полный URL, возвращаем как есть
      return url;
    }
    
    // Для других платформ возвращаем URL как есть
    return link.url;
  }
}


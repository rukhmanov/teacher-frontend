import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TeachersService } from '../../../core/services/teachers.service';
import { TeacherProfile, SocialLink, SocialPlatform } from '../../../core/models/teacher.interface';

@Component({
  selector: 'app-contact-section',
  standalone: true,
  imports: [CommonModule],
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
      [SocialPlatform.INSTAGRAM]: 'fab fa-instagram',
      [SocialPlatform.FACEBOOK]: 'fab fa-facebook',
      [SocialPlatform.YOUTUBE]: 'fab fa-youtube',
      [SocialPlatform.CUSTOM]: 'fas fa-link',
    };
    return icons[platform] || 'fas fa-link';
  }
}

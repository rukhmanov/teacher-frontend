import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { TeacherProfile, SocialLink, SocialPlatform } from '../../../core/models/teacher.interface';
import { HeaderComponent } from '../../../shared/components/header/header.component';

@Component({
  selector: 'app-teacher-profile-edit',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, HeaderComponent],
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

  constructor(
    private teachersService: TeachersService,
    private uploadService: UploadService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadProfile();
    this.loadSocialLinks();
  }

  loadProfile() {
    this.teachersService.getOwnProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
      },
    });
  }

  loadSocialLinks() {
    this.teachersService.getOwnSocialLinks().subscribe({
      next: (links) => {
        this.socialLinks = links;
      },
    });
  }

  updateProfile() {
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
    this.teachersService.addSocialLink(this.newSocialLink as any).subscribe({
      next: () => {
        this.loadSocialLinks();
        this.newSocialLink = { platform: SocialPlatform.VK, url: '' };
      },
    });
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
}

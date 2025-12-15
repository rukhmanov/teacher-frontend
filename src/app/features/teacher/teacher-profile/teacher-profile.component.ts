import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule, RouterOutlet } from '@angular/router';
import { TeachersService } from '../../../core/services/teachers.service';
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teachersService: TeachersService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.username = params['username'];
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
}

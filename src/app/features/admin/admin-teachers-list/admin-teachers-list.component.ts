import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { TeacherProfile } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-admin-teachers-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-teachers-list.component.html',
  styleUrl: './admin-teachers-list.component.scss',
})
export class AdminTeachersListComponent implements OnInit {
  teachers: TeacherProfile[] = [];
  placeholder = PlaceholderUtil;

  constructor(
    private adminService: AdminService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadTeachers();
  }

  loadTeachers() {
    this.adminService.getAllTeachers().subscribe({
      next: (teachers) => {
        this.teachers = teachers;
      },
    });
  }

  editTeacher(id: string) {
    this.router.navigate(['/admin/teachers', id, 'edit']);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholder.getAvatarPlaceholder();
    }
  }
}




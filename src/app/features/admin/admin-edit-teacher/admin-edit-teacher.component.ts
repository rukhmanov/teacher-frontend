import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { TeacherProfile } from '../../../core/models/teacher.interface';

@Component({
  selector: 'app-admin-edit-teacher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-edit-teacher.component.html',
  styleUrl: './admin-edit-teacher.component.scss',
})
export class AdminEditTeacherComponent implements OnInit {
  teacher: Partial<TeacherProfile> = {};
  teacherId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.teacherId = params['id'];
      // Load teacher data - можно добавить загрузку данных преподавателя
    });
  }

  save() {
    this.adminService.updateTeacher(this.teacherId, this.teacher).subscribe({
      next: () => {
        this.router.navigate(['/admin/teachers']);
      },
    });
  }

  cancel() {
    this.router.navigate(['/admin/teachers']);
  }
}


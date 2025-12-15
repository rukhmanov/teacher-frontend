import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { TeacherProfile } from '../../../core/models/teacher.interface';

@Component({
  selector: 'app-admin-teachers-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-teachers-list.component.html',
  styleUrl: './admin-teachers-list.component.scss',
})
export class AdminTeachersListComponent implements OnInit {
  teachers: TeacherProfile[] = [];

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
}

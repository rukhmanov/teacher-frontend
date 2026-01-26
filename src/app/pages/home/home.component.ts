import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { TeachersService } from '../../core/services/teachers.service';
import { TeacherProfile } from '../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../core/utils/placeholder.util';
import { RegisterFormData } from '../../core/models/user.interface';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  teachers: TeacherProfile[] = [];
  activeTab: 'login' | 'register' = 'login';
  placeholder = PlaceholderUtil;
  
  loginData = {
    email: '',
    password: '',
  };

  registerData: RegisterFormData = {
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    patronymic: '',
  };

  error: string = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private teachersService: TeachersService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadTeachers();
    if (this.authService.isAuthenticated()) {
      const user = this.authService.getCurrentUser();
      if (user?.role === 'ADMIN') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/me/profile']);
      }
    }
  }

  loadTeachers() {
    this.teachersService.getAllTeachers().subscribe({
      next: (teachers) => {
        // Исключаем администратора из списка
        this.teachers = teachers.filter(
          (teacher) => teacher.user?.email !== 'admin@admin.com'
        );
      },
      error: (err) => {
        console.error('Error loading teachers:', err);
      },
    });
  }

  onLogin() {
    this.loading = true;
    this.error = '';
    this.authService.login(this.loginData.email, this.loginData.password).subscribe({
      next: (response) => {
        const user = response.user;
        if (user.role === 'ADMIN') {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/me/profile']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Ошибка входа. Проверьте данные.';
        this.loading = false;
      },
    });
  }

  onRegister() {
    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.error = 'Пароли не совпадают';
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(this.registerData.username)) {
      this.error = 'Username должен содержать только латинские буквы, цифры и подчеркивания';
      return;
    }

    this.loading = true;
    this.error = '';
    
    const { confirmPassword, ...registerPayload } = this.registerData;
    
    this.authService.register(registerPayload).subscribe({
      next: (response) => {
        this.router.navigate(['/me/profile']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Ошибка регистрации';
        if (this.error.includes('whitelist') || this.error.includes('not in')) {
          this.error += '. Свяжитесь с администратором @AleksRukhman в Telegram';
        }
        this.loading = false;
      },
    });
  }

  switchTab(tab: 'login' | 'register') {
    this.activeTab = tab;
    this.error = '';
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholder.getAvatarPlaceholder();
    }
  }

  getFullName(teacher: TeacherProfile): string {
    const parts = [teacher.firstName, teacher.patronymic, teacher.lastName].filter(p => p);
    return parts.join(' ');
  }
}





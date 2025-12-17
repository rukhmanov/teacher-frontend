import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TeachersService } from '../../../core/services/teachers.service';
import { User } from '../../../core/models/user.interface';
import { TeacherProfile } from '../../../core/models/teacher.interface';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  isMenuOpen = false;
  isTeacherPage = false;
  isEditPage = false;
  teacherProfile: TeacherProfile | null = null;
  private routeSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private teachersService: TeachersService,
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // Если это страница редактирования и есть пользователь, загружаем его профиль
      if (this.isEditPage && user) {
        this.loadOwnProfile();
      }
    });

    // Отслеживаем изменения роута для определения страницы педагога
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Упрощенный хедер только для публичных страниц педагога, не для редактирования
        const isTeacherPage = (event.url?.includes('/teacher/') && !event.url?.includes('/me/')) || false;
        const isEditPage = event.url?.includes('/me/') || false;
        this.isTeacherPage = isTeacherPage;
        this.isEditPage = isEditPage;
        
        if (isTeacherPage) {
          // Извлекаем username из URL
          const match = event.url.match(/\/teacher\/([^\/]+)/);
          if (match && match[1]) {
            this.loadTeacherProfile(match[1]);
          }
        } else if (isEditPage && this.currentUser) {
          // Загружаем профиль текущего пользователя для страницы редактирования
          this.loadOwnProfile();
        } else {
          this.teacherProfile = null;
        }
      });

    // Проверяем текущий URL при инициализации
    const currentUrl = this.router.url;
    this.isTeacherPage = (currentUrl.includes('/teacher/') && !currentUrl.includes('/me/')) || false;
    this.isEditPage = currentUrl.includes('/me/') || false;
    
    if (this.isTeacherPage) {
      const match = currentUrl.match(/\/teacher\/([^\/]+)/);
      if (match && match[1]) {
        this.loadTeacherProfile(match[1]);
      }
    } else if (this.isEditPage && this.currentUser) {
      this.loadOwnProfile();
    }
  }

  ngOnDestroy() {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  private loadTeacherProfile(username: string) {
    this.teachersService.getTeacherByUsername(username).subscribe({
      next: (teacher) => {
        this.teacherProfile = teacher;
      },
      error: (err) => {
        console.error('Error loading teacher profile for header:', err);
        this.teacherProfile = null;
      },
    });
  }

  private loadOwnProfile() {
    this.teachersService.getOwnProfile().subscribe({
      next: (teacher) => {
        this.teacherProfile = teacher;
      },
      error: (err) => {
        console.error('Error loading own profile for header:', err);
        this.teacherProfile = null;
      },
    });
  }

  getDisplayName(): string {
    if (this.isEditPage) {
      // Для страницы редактирования используем имя из профиля учителя
      if (this.teacherProfile) {
        const firstName = this.teacherProfile.firstName || '';
        const lastName = this.teacherProfile.lastName || '';
        if (firstName || lastName) {
          return `${firstName} ${lastName}`.trim();
        }
      }
      // Если профиль еще не загружен, используем email
      if (this.currentUser) {
        return this.currentUser.email || 'Пользователь';
      }
      return 'Пользователь';
    }
    if (this.teacherProfile) {
      const firstName = this.teacherProfile.firstName || '';
      const lastName = this.teacherProfile.lastName || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      // Если нет имени, используем username из URL
      const match = this.router.url.match(/\/teacher\/([^\/]+)/);
      return match ? match[1] : '';
    }
    return '';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }
}



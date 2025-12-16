import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'teacher/:username',
    loadComponent: () =>
      import('./features/teacher/teacher-profile/teacher-profile.component').then(
        (m) => m.TeacherProfileComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
      {
        path: 'home',
        loadComponent: () =>
          import(
            './features/teacher/home-section/home-section.component'
          ).then((m) => m.HomeSectionComponent),
      },
      {
        path: 'master-classes',
        loadComponent: () =>
          import(
            './features/teacher/master-classes-section/master-classes-section.component'
          ).then((m) => m.MasterClassesSectionComponent),
      },
      {
        path: 'presentations',
        loadComponent: () =>
          import(
            './features/teacher/presentations-section/presentations-section.component'
          ).then((m) => m.PresentationsSectionComponent),
      },
      {
        path: 'parents',
        loadComponent: () =>
          import(
            './features/teacher/parent-section/parent-section.component'
          ).then((m) => m.ParentSectionComponent),
      },
      {
        path: 'life',
        loadComponent: () =>
          import(
            './features/teacher/life-in-dou-section/life-in-dou-section.component'
          ).then((m) => m.LifeInDOUSectionComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import(
            './features/teacher/contact-section/contact-section.component'
          ).then((m) => m.ContactSectionComponent),
      },
    ],
  },
  {
    path: 'me',
    canActivate: [authGuard],
    loadComponent: () =>
      import(
        './features/teacher/teacher-profile-edit/teacher-profile-edit.component'
      ).then((m) => m.TeacherProfileEditComponent),
    children: [
      {
        path: '',
        redirectTo: 'profile',
        pathMatch: 'full',
      },
      {
        path: 'profile',
        // Профиль редактируется в родительском компоненте, поэтому используем пустой компонент
        loadComponent: () =>
          import('./shared/components/empty-route/empty-route.component').then(
            (m) => m.EmptyRouteComponent,
          ),
      },
      {
        path: 'home',
        loadComponent: () =>
          import(
            './features/teacher/home-section/home-section.component'
          ).then((m) => m.HomeSectionComponent),
      },
      {
        path: 'master-classes',
        loadComponent: () =>
          import(
            './features/teacher/master-classes-section/master-classes-section.component'
          ).then((m) => m.MasterClassesSectionComponent),
      },
      {
        path: 'presentations',
        loadComponent: () =>
          import(
            './features/teacher/presentations-section/presentations-section.component'
          ).then((m) => m.PresentationsSectionComponent),
      },
      {
        path: 'parents',
        loadComponent: () =>
          import(
            './features/teacher/parent-section/parent-section.component'
          ).then((m) => m.ParentSectionComponent),
      },
      {
        path: 'life',
        loadComponent: () =>
          import(
            './features/teacher/life-in-dou-section/life-in-dou-section.component'
          ).then((m) => m.LifeInDOUSectionComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import(
            './features/teacher/contact-section/contact-section.component'
          ).then((m) => m.ContactSectionComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./features/admin/admin-dashboard/admin-dashboard.component').then(
        (m) => m.AdminDashboardComponent,
      ),
    children: [
      {
        path: '',
        redirectTo: 'teachers',
        pathMatch: 'full',
      },
      {
        path: 'teachers',
        loadComponent: () =>
          import(
            './features/admin/admin-teachers-list/admin-teachers-list.component'
          ).then((m) => m.AdminTeachersListComponent),
      },
      {
        path: 'teachers/:id/edit',
        loadComponent: () =>
          import(
            './features/admin/admin-edit-teacher/admin-edit-teacher.component'
          ).then((m) => m.AdminEditTeacherComponent),
      },
      {
        path: 'whitelist',
        loadComponent: () =>
          import(
            './features/admin/admin-whitelist/admin-whitelist.component'
          ).then((m) => m.AdminWhitelistComponent),
      },
    ],
  },
];

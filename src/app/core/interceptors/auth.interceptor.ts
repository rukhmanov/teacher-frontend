import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Перенаправляем только если это не публичный запрос
        // Публичные запросы не должны возвращать 401, но на всякий случай проверяем
        const isPublicRequest = req.url.includes('/teachers/') && 
                                !req.url.includes('/me/') && 
                                !req.url.includes('/admin/');
        
        if (!isPublicRequest) {
          authService.logout();
          router.navigate(['/']);
        }
      }
      return throwError(() => error);
    }),
  );
};


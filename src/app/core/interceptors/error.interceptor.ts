import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Пропускаем ошибки, которые уже обрабатываются в authInterceptor
      if (error.status === 401) {
        return throwError(() => error);
      }

      // Получаем сообщение об ошибке
      let errorMessage = 'Произошла ошибка';

      if (error.error) {
        // Если есть сообщение в error.error.message
        if (error.error.message) {
          errorMessage = error.error.message;
        }
        // Если есть массив сообщений (для валидации)
        else if (Array.isArray(error.error.message)) {
          errorMessage = error.error.message.join(', ');
        }
        // Если есть строка
        else if (typeof error.error.message === 'string') {
          errorMessage = error.error.message;
        }
        // Если error.error - это строка
        else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
      }

      // Специальные сообщения для разных статусов
      if (!error.error?.message) {
        switch (error.status) {
          case 400:
            errorMessage = 'Неверный запрос';
            break;
          case 403:
            errorMessage = 'Доступ запрещен';
            break;
          case 404:
            errorMessage = 'Ресурс не найден';
            break;
          case 409:
            errorMessage = 'Конфликт данных';
            break;
          case 500:
            errorMessage = 'Внутренняя ошибка сервера';
            break;
          case 503:
            errorMessage = 'Сервис временно недоступен';
            break;
          default:
            if (error.status >= 500) {
              errorMessage = 'Ошибка сервера';
            } else if (error.status >= 400) {
              errorMessage = 'Ошибка запроса';
            } else {
              errorMessage = 'Ошибка сети';
            }
        }
      }

      // Показываем тост с ошибкой
      toastService.error(errorMessage);

      return throwError(() => error);
    }),
  );
};


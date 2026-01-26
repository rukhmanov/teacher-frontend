import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private toastsSubject = new Subject<Toast>();
  public toasts$: Observable<Toast> = this.toastsSubject.asObservable();

  private toastIdCounter = 0;

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 5000): void {
    const toast: Toast = {
      id: `toast-${this.toastIdCounter++}`,
      message,
      type,
      duration,
    };
    this.toastsSubject.next(toast);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration || 7000);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }
}


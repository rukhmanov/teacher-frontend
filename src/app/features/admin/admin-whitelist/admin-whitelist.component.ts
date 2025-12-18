import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { WhitelistEmail } from '../../../core/models/teacher.interface';

@Component({
  selector: 'app-admin-whitelist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-whitelist.component.html',
  styleUrl: './admin-whitelist.component.scss',
})
export class AdminWhitelistComponent implements OnInit {
  whitelist: WhitelistEmail[] = [];
  newEmail: string = '';

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
  ) {}

  ngOnInit() {
    this.loadWhitelist();
  }

  loadWhitelist() {
    this.adminService.getWhitelist().subscribe({
      next: (list) => {
        // Исключаем admin@admin.com из списка
        this.whitelist = list.filter(
          (item) => item.email !== 'admin@admin.com'
        );
      },
    });
  }

  addEmail() {
    if (this.newEmail) {
      this.adminService.addToWhitelist(this.newEmail).subscribe({
        next: () => {
          this.toastService.success('Email успешно добавлен в белый список');
          this.loadWhitelist();
          this.newEmail = '';
        },
        error: (err) => {
          console.error('Error adding email to whitelist:', err);
          // Ошибка уже будет показана через errorInterceptor
        },
      });
    }
  }

  removeEmail(id: string) {
    if (confirm('Удалить этот email из белого списка? Пользователь с этим email также будет удален.')) {
      this.adminService.removeFromWhitelist(id).subscribe({
        next: () => {
          this.toastService.success('Email и пользователь успешно удалены');
          this.loadWhitelist();
        },
        error: (err) => {
          console.error('Error removing email from whitelist:', err);
          // Ошибка уже будет показана через errorInterceptor
        },
      });
    }
  }
}




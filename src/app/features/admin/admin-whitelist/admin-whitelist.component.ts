import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
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

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadWhitelist();
  }

  loadWhitelist() {
    this.adminService.getWhitelist().subscribe({
      next: (list) => {
        this.whitelist = list;
      },
    });
  }

  addEmail() {
    if (this.newEmail) {
      this.adminService.addToWhitelist(this.newEmail).subscribe({
        next: () => {
          this.loadWhitelist();
          this.newEmail = '';
        },
      });
    }
  }

  removeEmail(id: string) {
    if (confirm('Удалить этот email из белого списка?')) {
      this.adminService.removeFromWhitelist(id).subscribe({
        next: () => {
          this.loadWhitelist();
        },
      });
    }
  }
}

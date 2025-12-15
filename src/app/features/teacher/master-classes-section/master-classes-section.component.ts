import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { MasterClass } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-master-classes-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-classes-section.component.html',
  styleUrl: './master-classes-section.component.scss',
})
export class MasterClassesSectionComponent implements OnInit {
  masterClasses: MasterClass[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  newMasterClass: Partial<MasterClass> = {
    title: '',
    description: '',
    content: '',
  };
  placeholder = PlaceholderUtil;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    // username находится в родительском роуте для публичных страниц
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicMasterClasses();
      } else {
        this.isEditMode = true;
        this.loadOwnMasterClasses();
      }
    });
  }

  loadPublicMasterClasses() {
    if (this.username) {
      this.teachersService.getMasterClasses(this.username).subscribe({
        next: (classes) => {
          this.masterClasses = classes;
        },
      });
    }
  }

  loadOwnMasterClasses() {
    this.teachersService.getOwnMasterClasses().subscribe({
      next: (classes) => {
        this.masterClasses = classes;
      },
    });
  }

  createMasterClass() {
    this.teachersService.createMasterClass(this.newMasterClass as any).subscribe({
      next: () => {
        this.loadOwnMasterClasses();
        this.showForm = false;
        this.newMasterClass = { title: '', description: '', content: '' };
      },
    });
  }

  deleteMasterClass(id: string) {
    if (confirm('Удалить этот мастер-класс?')) {
      this.teachersService.deleteMasterClass(id).subscribe({
        next: () => {
          this.loadOwnMasterClasses();
        },
      });
    }
  }
}

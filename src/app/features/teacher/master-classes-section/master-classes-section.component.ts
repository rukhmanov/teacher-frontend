import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { UploadService } from '../../../core/services/upload.service';
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
  editingMasterClassId: string | null = null;
  newMasterClass: Partial<MasterClass> = {
    title: '',
    description: '',
    content: '',
    cardColor: '',
  };
  placeholder = PlaceholderUtil;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private authService: AuthService,
    private uploadService: UploadService,
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
    this.submitMasterClass();
  }

  private submitMasterClass() {
    if (this.editingMasterClassId) {
      this.teachersService.updateMasterClass(this.editingMasterClassId, this.newMasterClass as any).subscribe({
        next: () => {
          this.loadOwnMasterClasses();
          this.cancelEdit();
        },
      });
    } else {
      this.teachersService.createMasterClass(this.newMasterClass as any).subscribe({
        next: () => {
          this.loadOwnMasterClasses();
          this.cancelEdit();
        },
      });
    }
  }

  editMasterClass(masterClass: MasterClass) {
    this.editingMasterClassId = masterClass.id;
    this.newMasterClass = {
      title: masterClass.title,
      description: masterClass.description,
      content: masterClass.content,
      cardColor: masterClass.cardColor || '',
    };
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingMasterClassId = null;
    this.newMasterClass = { title: '', description: '', content: '', cardColor: '' };
  }

  removeCardColor() {
    this.newMasterClass.cardColor = '';
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


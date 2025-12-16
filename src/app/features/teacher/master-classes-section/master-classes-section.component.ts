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
    coverImage: '',
  };
  placeholder = PlaceholderUtil;
  selectedCoverImage: File | null = null;
  coverImagePreview: string | null = null;

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
    if (this.selectedCoverImage) {
      this.uploadService.uploadImage(this.selectedCoverImage).subscribe({
        next: (response) => {
          this.newMasterClass.coverImage = response.url;
          this.submitMasterClass();
        },
        error: (err) => {
          console.error('Error uploading cover image:', err);
          this.submitMasterClass();
        },
      });
    } else {
      this.submitMasterClass();
    }
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
      coverImage: masterClass.coverImage || '',
    };
    this.selectedCoverImage = null;
    this.coverImagePreview = masterClass.coverImage ? this.placeholder.getImageUrl(masterClass.coverImage, 'gallery') : null;
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingMasterClassId = null;
    this.newMasterClass = { title: '', description: '', content: '', cardColor: '', coverImage: '' };
    this.selectedCoverImage = null;
    this.coverImagePreview = null;
  }

  onCoverImageSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedCoverImage = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          this.coverImagePreview = e.target.result as string;
        }
      };
      reader.readAsDataURL(this.selectedCoverImage);
    }
  }

  removeCoverImage() {
    this.selectedCoverImage = null;
    this.coverImagePreview = null;
    this.newMasterClass.coverImage = '';
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


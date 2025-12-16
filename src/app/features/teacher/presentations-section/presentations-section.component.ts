import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { Presentation } from '../../../core/models/teacher.interface';

@Component({
  selector: 'app-presentations-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './presentations-section.component.html',
  styleUrl: './presentations-section.component.scss',
})
export class PresentationsSectionComponent implements OnInit {
  presentations: Presentation[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  newPresentation: Partial<Presentation> = { title: '', description: '', fileUrl: '' };
  selectedFile: File | null = null;
  useFileUpload = false;
  isUploading = false;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private uploadService: UploadService,
  ) {}

  ngOnInit() {
    // username находится в родительском роуте для публичных страниц
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicPresentations();
      } else {
        this.isEditMode = true;
        this.loadOwnPresentations();
      }
    });
  }

  loadPublicPresentations() {
    if (this.username) {
      this.teachersService.getPresentations(this.username).subscribe({
        next: (presentations) => {
          this.presentations = presentations;
        },
      });
    }
  }

  loadOwnPresentations() {
    this.teachersService.getOwnPresentations().subscribe({
      next: (presentations) => {
        this.presentations = presentations;
      },
    });
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  switchToUrl() {
    this.useFileUpload = false;
    this.selectedFile = null;
  }

  switchToFileUpload() {
    this.useFileUpload = true;
    this.newPresentation.fileUrl = '';
  }

  createPresentation() {
    if (!this.newPresentation.title) {
      alert('Пожалуйста, укажите название презентации');
      return;
    }

    // Если выбран режим загрузки файла
    if (this.useFileUpload) {
      if (!this.selectedFile) {
        alert('Пожалуйста, выберите файл для загрузки');
        return;
      }
      this.isUploading = true;
      this.uploadService.uploadFile(this.selectedFile).subscribe({
        next: (response) => {
          this.newPresentation.fileUrl = response.url;
          this.createPresentationWithUrl();
        },
        error: () => {
          this.isUploading = false;
          alert('Ошибка при загрузке файла');
        },
      });
    } else {
      // Режим URL
      if (!this.newPresentation.fileUrl) {
        alert('Пожалуйста, укажите URL файла');
        return;
      }
      this.createPresentationWithUrl();
    }
  }

  private createPresentationWithUrl() {
    this.teachersService.createPresentation(this.newPresentation as any).subscribe({
      next: () => {
        this.loadOwnPresentations();
        this.showForm = false;
        this.resetForm();
      },
      error: () => {
        this.isUploading = false;
      },
      complete: () => {
        this.isUploading = false;
      },
    });
  }

  private resetForm() {
    this.newPresentation = { title: '', description: '', fileUrl: '' };
    this.selectedFile = null;
    this.useFileUpload = false;
  }

  deletePresentation(id: string) {
    if (confirm('Удалить эту презентацию?')) {
      this.teachersService.deletePresentation(id).subscribe({
        next: () => {
          this.loadOwnPresentations();
        },
      });
    }
  }
}


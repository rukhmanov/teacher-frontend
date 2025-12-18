import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { ParentSection } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-parent-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parent-section.component.html',
  styleUrl: './parent-section.component.scss',
})
export class ParentSectionComponent implements OnInit {
  sections: ParentSection[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  editingSectionId: string | null = null;
  newSection: Partial<ParentSection> = { title: '', content: '', cardColor: '', files: [] };
  placeholder = PlaceholderUtil;
  isUploading = false;
  selectedFiles: File[] = [];
  uploadedFileUrls: string[] = [];

  // Модальное окно
  showModal: boolean = false;
  selectedSection: ParentSection | null = null;

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
        this.loadPublicSections();
      } else {
        this.isEditMode = true;
        this.loadOwnSections();
      }
    });
  }

  loadPublicSections() {
    if (this.username) {
      this.teachersService.getParentSections(this.username).subscribe({
        next: (sections) => {
          this.sections = sections;
        },
      });
    }
  }

  loadOwnSections() {
    this.teachersService.getOwnParentSections().subscribe({
      next: (sections) => {
        this.sections = sections;
      },
    });
  }

  createSection() {
    if (this.selectedFiles.length > 0) {
      this.uploadFiles();
    } else {
      this.submitSection();
    }
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles = Array.from(input.files);
    }
  }

  removeSelectedFile(index: number) {
    this.selectedFiles.splice(index, 1);
  }

  uploadFiles() {
    if (this.selectedFiles.length === 0) {
      this.submitSection();
      return;
    }

    this.isUploading = true;
    const uploadObservables = this.selectedFiles.map(file => 
      this.uploadService.uploadFile(file)
    );

    forkJoin(uploadObservables).subscribe({
      next: (responses) => {
        this.uploadedFileUrls = responses.map(r => r.url);
        if (this.newSection.files) {
          this.newSection.files = [...this.newSection.files, ...this.uploadedFileUrls];
        } else {
          this.newSection.files = [...this.uploadedFileUrls];
        }
        this.selectedFiles = [];
        this.uploadedFileUrls = [];
        this.submitSection();
      },
      error: () => {
        this.isUploading = false;
        alert('Ошибка при загрузке файлов');
      },
    });
  }

  removeFile(fileUrl: string) {
    if (this.newSection.files) {
      this.newSection.files = this.newSection.files.filter(f => f !== fileUrl);
    }
  }

  private submitSection() {
    if (this.editingSectionId) {
      this.teachersService.updateParentSection(this.editingSectionId, this.newSection as any).subscribe({
        next: () => {
          this.loadOwnSections();
          this.cancelEdit();
        },
        error: () => {
          this.isUploading = false;
        },
        complete: () => {
          this.isUploading = false;
        },
      });
    } else {
      this.teachersService.createParentSection(this.newSection as any).subscribe({
        next: () => {
          this.loadOwnSections();
          this.cancelEdit();
        },
        error: () => {
          this.isUploading = false;
        },
        complete: () => {
          this.isUploading = false;
        },
      });
    }
  }

  editSection(section: ParentSection) {
    this.editingSectionId = section.id;
    this.newSection = {
      title: section.title,
      content: section.content,
      cardColor: section.cardColor || '',
      files: section.files ? [...section.files] : [],
    };
    this.selectedFiles = [];
    this.uploadedFileUrls = [];
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingSectionId = null;
    this.newSection = { title: '', content: '', cardColor: '', files: [] };
    this.selectedFiles = [];
    this.uploadedFileUrls = [];
  }

  removeCardColor() {
    this.newSection.cardColor = '';
  }

  deleteSection(id: string) {
    if (confirm('Удалить этот раздел?')) {
      this.teachersService.deleteParentSection(id).subscribe({
        next: () => {
          this.loadOwnSections();
        },
      });
    }
  }

  getTruncatedContent(content: string | undefined): string {
    if (!content) return '';
    // Убираем HTML теги для подсчета длины
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > 200 ? textContent.substring(0, 200) + '...' : content;
  }

  shouldShowFullButton(section: ParentSection): boolean {
    if (!section.content) return false;
    const textContent = section.content.replace(/<[^>]*>/g, '');
    return textContent.length > 200;
  }

  openModal(section: ParentSection): void {
    this.selectedSection = section;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedSection = null;
    document.body.style.overflow = '';
  }

  getFileName(fileUrl: string): string {
    if (!fileUrl) return '';
    const parts = fileUrl.split('/');
    return parts[parts.length - 1] || fileUrl;
  }

  getFileIcon(fileUrl: string): string {
    if (!fileUrl) return 'fa-file';
    const url = fileUrl.toLowerCase();
    if (url.endsWith('.pdf')) return 'fa-file-pdf';
    if (url.endsWith('.doc') || url.endsWith('.docx')) return 'fa-file-word';
    if (url.endsWith('.xls') || url.endsWith('.xlsx')) return 'fa-file-excel';
    if (url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || url.endsWith('.gif')) return 'fa-file-image';
    return 'fa-file';
  }
}




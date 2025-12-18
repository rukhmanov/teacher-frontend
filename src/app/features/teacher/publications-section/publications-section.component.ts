import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { Publication } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-publications-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './publications-section.component.html',
  styleUrl: './publications-section.component.scss',
})
export class PublicationsSectionComponent implements OnInit {
  publications: Publication[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  editingPublicationId: string | null = null;
  newPublication: Partial<Publication> = { title: '', description: '', fileUrl: '', cardColor: '', type: 'publication' }; // Только публикации
  selectedFile: File | null = null;
  useFileUpload = false;
  isUploading = false;
  placeholder = PlaceholderUtil;

  // Модальное окно
  showModal: boolean = false;
  selectedPublication: Publication | null = null;
  showViewerModal: boolean = false;
  viewerPublication: Publication | null = null;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private uploadService: UploadService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    // username находится в родительском роуте для публичных страниц
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicPublications();
      } else {
        this.isEditMode = true;
        this.loadOwnPublications();
      }
    });
  }

  loadPublicPublications() {
    if (this.username) {
      this.teachersService.getPublications(this.username).subscribe({
        next: (publications) => {
          // Фильтруем только публикации
          this.publications = publications.filter(p => !p.type || p.type === 'publication');
        },
      });
    }
  }

  loadOwnPublications() {
    this.teachersService.getOwnPublications().subscribe({
      next: (publications) => {
        // Фильтруем только публикации
        this.publications = publications.filter(p => !p.type || p.type === 'publication');
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
    this.newPublication.fileUrl = '';
  }

  createPublication() {
    if (!this.newPublication.title) {
      alert('Пожалуйста, укажите название');
      return;
    }

    this.continuePublicationCreation();
  }

  private continuePublicationCreation() {
    // Если выбран режим загрузки файла
    if (this.useFileUpload) {
      if (!this.selectedFile) {
        alert('Пожалуйста, выберите файл для загрузки');
        this.isUploading = false;
        return;
      }
      this.isUploading = true;
      this.uploadService.uploadFile(this.selectedFile).subscribe({
        next: (response) => {
          this.newPublication.fileUrl = response.url;
          this.createPublicationWithUrl();
        },
        error: () => {
          this.isUploading = false;
          alert('Ошибка при загрузке файла');
        },
      });
    } else {
      // Режим URL
      if (!this.newPublication.fileUrl) {
        alert('Пожалуйста, укажите URL файла');
        this.isUploading = false;
        return;
      }
      this.createPublicationWithUrl();
    }
  }

  private createPublicationWithUrl() {
    if (this.editingPublicationId) {
      this.teachersService.updatePublication(this.editingPublicationId, this.newPublication as any).subscribe({
        next: () => {
          this.loadOwnPublications();
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
      this.teachersService.createPublication(this.newPublication as any).subscribe({
        next: () => {
          this.loadOwnPublications();
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

  editPublication(publication: Publication) {
    this.editingPublicationId = publication.id;
    this.newPublication = {
      title: publication.title,
      description: publication.description,
      fileUrl: publication.fileUrl,
      cardColor: publication.cardColor || '',
      type: publication.type || 'publication',
    };
    this.selectedFile = null;
    this.useFileUpload = false;
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingPublicationId = null;
    this.resetForm();
  }

  private resetForm() {
    this.newPublication = { title: '', description: '', fileUrl: '', cardColor: '', type: 'publication' };
    this.selectedFile = null;
    this.useFileUpload = false;
  }

  removeCardColor() {
    this.newPublication.cardColor = '';
  }

  deletePublication(id: string) {
    if (confirm('Удалить эту публикацию/сертификат?')) {
      this.teachersService.deletePublication(id).subscribe({
        next: () => {
          this.loadOwnPublications();
        },
      });
    }
  }

  getTruncatedDescription(description: string | undefined): string {
    if (!description) return '';
    return description.length > 200 ? description.substring(0, 200) + '...' : description;
  }

  shouldShowFullButton(publication: Publication): boolean {
    return !!(publication.description && publication.description.length > 200);
  }

  openModal(publication: Publication): void {
    this.selectedPublication = publication;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPublication = null;
    document.body.style.overflow = '';
  }

  openViewerModal(publication: Publication): void {
    this.viewerPublication = publication;
    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerPublication = null;
    document.body.style.overflow = '';
  }

  getPreviewUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;
    
    const url = fileUrl.toLowerCase();
    let previewUrl: string | null = null;
    
    // Для PPTX файлов используем Office Online Viewer (лучше для PPTX)
    if (url.endsWith('.pptx') || url.endsWith('.ppt')) {
      previewUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
    // Для PDF используем Google Docs Viewer
    else if (url.endsWith('.pdf')) {
      previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    // Для ODP используем Google Docs Viewer
    else if (url.endsWith('.odp')) {
      previewUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    
    return previewUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl) : null;
  }

  getViewerUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;
    
    const url = fileUrl.toLowerCase();
    let viewerUrl: string | null = null;
    
    // Для PPTX/PPT используем Office Online Viewer
    if (url.endsWith('.pptx') || url.endsWith('.ppt')) {
      viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
    // Для PDF используем Google Docs Viewer
    else if (url.endsWith('.pdf')) {
      viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    // Для ODP используем Google Docs Viewer
    else if (url.endsWith('.odp')) {
      viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    }
    
    return viewerUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl) : null;
  }

  isPptxFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.pptx') || url.endsWith('.ppt') || url.endsWith('.pdf') || url.endsWith('.odp');
  }

  canViewInBrowser(fileUrl: string): boolean {
    return this.getViewerUrl(fileUrl) !== null;
  }

  openInBrowser(publication: Publication): void {
    const viewerUrl = this.getViewerUrl(publication.fileUrl);
    if (viewerUrl) {
      // SafeResourceUrl имеет свойство changingThisBreaksApplicationSecurity для получения строки
      window.open((viewerUrl as any).changingThisBreaksApplicationSecurity || viewerUrl.toString(), '_blank');
    }
  }

  getTypeLabel(type: string | undefined): string {
    return type === 'certificate' ? 'Сертификат' : 'Публикация';
  }

  getTypeIcon(type: string | undefined): string {
    return type === 'certificate' ? 'fa-certificate' : 'fa-file-alt';
  }
}

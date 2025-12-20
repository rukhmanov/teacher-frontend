import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { Publication } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-certificates-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './certificates-section.component.html',
  styleUrl: './certificates-section.component.scss',
})
export class CertificatesSectionComponent implements OnInit {
  certificates: Publication[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  editingCertificateId: string | null = null;
  newCertificate: Partial<Publication> = { title: '', description: '', fileUrl: '', cardColor: '', type: 'certificate' };
  selectedFile: File | null = null;
  useFileUpload = false;
  isUploading = false;
  placeholder = PlaceholderUtil;

  // Модальное окно
  showModal: boolean = false;
  selectedCertificate: Publication | null = null;
  showViewerModal: boolean = false;
  viewerCertificate: Publication | null = null;
  
  // Состояние развернутости карточек
  expandedCards: Set<string> = new Set();

  // Пагинация и бесконечный скролл
  private skip = 0;
  private readonly take = 5;
  hasMore = true;
  isLoading = false;

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
      this.resetPagination();
      if (this.username) {
        this.loadPublicCertificates();
      } else {
        this.isEditMode = true;
        this.loadOwnCertificates();
      }
    });
  }

  private resetPagination() {
    this.skip = 0;
    this.hasMore = true;
    this.certificates = [];
  }

  loadPublicCertificates(reset = false) {
    if (!this.username || this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getCertificates(this.username, this.skip, this.take).subscribe({
      next: (certificates) => {
        if (reset) {
          this.certificates = certificates;
        } else {
          this.certificates = [...this.certificates, ...certificates];
        }

        this.hasMore = certificates.length === this.take;
        this.skip += certificates.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadOwnCertificates(reset = false) {
    if (this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getOwnCertificates(this.skip, this.take).subscribe({
      next: (certificates) => {
        if (reset) {
          this.certificates = certificates;
        } else {
          this.certificates = [...this.certificates, ...certificates];
        }

        this.hasMore = certificates.length === this.take;
        this.skip += certificates.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    if (this.isLoading || !this.hasMore) return;

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

    // Загружаем следующую порцию, когда пользователь прокрутил до 80% страницы
    if (scrollTop + windowHeight >= documentHeight * 0.8) {
      if (this.username) {
        this.loadPublicCertificates();
      } else {
        this.loadOwnCertificates();
      }
    }
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
    this.newCertificate.fileUrl = '';
  }

  createCertificate() {
    if (!this.newCertificate.title) {
      alert('Пожалуйста, укажите название');
      return;
    }

    this.continueCertificateCreation();
  }

  private continueCertificateCreation() {
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
          this.newCertificate.fileUrl = response.url;
          this.createCertificateWithUrl();
        },
        error: () => {
          this.isUploading = false;
          alert('Ошибка при загрузке файла');
        },
      });
    } else {
      // Режим URL
      if (!this.newCertificate.fileUrl) {
        alert('Пожалуйста, укажите URL файла');
        this.isUploading = false;
        return;
      }
      this.createCertificateWithUrl();
    }
  }

  private createCertificateWithUrl() {
    if (this.editingCertificateId) {
      this.teachersService.updatePublication(this.editingCertificateId, this.newCertificate as any).subscribe({
        next: () => {
          this.loadOwnCertificates(true);
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
      this.teachersService.createPublication(this.newCertificate as any).subscribe({
        next: () => {
          this.loadOwnCertificates(true);
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

  editCertificate(certificate: Publication) {
    this.editingCertificateId = certificate.id;
    this.newCertificate = {
      title: certificate.title,
      description: certificate.description,
      fileUrl: certificate.fileUrl,
      cardColor: certificate.cardColor || '',
      type: 'certificate',
    };
    this.selectedFile = null;
    this.useFileUpload = false;
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingCertificateId = null;
    this.resetForm();
  }

  private resetForm() {
    this.newCertificate = { title: '', description: '', fileUrl: '', cardColor: '', type: 'certificate' };
    this.selectedFile = null;
    this.useFileUpload = false;
  }

  removeCardColor() {
    this.newCertificate.cardColor = '';
  }

  deleteCertificate(id: string) {
    if (confirm('Удалить этот сертификат?')) {
      this.teachersService.deletePublication(id).subscribe({
        next: () => {
          this.loadOwnCertificates(true);
        },
      });
    }
  }

  isCardExpanded(certificateId: string): boolean {
    return this.expandedCards.has(certificateId);
  }

  toggleCardExpansion(certificateId: string): void {
    if (this.expandedCards.has(certificateId)) {
      this.expandedCards.delete(certificateId);
    } else {
      this.expandedCards.add(certificateId);
    }
  }

  shouldShowExpandButton(certificate: Publication): boolean {
    if (!certificate.description) return false;
    // Проверяем, что текст достаточно длинный для обрезки (примерно 150+ символов)
    return certificate.description.length > 150;
  }

  openModal(certificate: Publication): void {
    this.selectedCertificate = certificate;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCertificate = null;
    document.body.style.overflow = '';
  }

  openViewerModal(certificate: Publication): void {
    this.viewerCertificate = certificate;
    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerCertificate = null;
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
    
    // Для изображений возвращаем прямой URL
    if (this.isImageFile(fileUrl)) {
      viewerUrl = fileUrl;
    }
    // Для Word документов используем Office Online Viewer
    else if (url.endsWith('.doc') || url.endsWith('.docx')) {
      viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    }
    // Для PPTX/PPT используем Office Online Viewer
    else if (url.endsWith('.pptx') || url.endsWith('.ppt')) {
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

  isImageFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || 
           url.endsWith('.gif') || url.endsWith('.webp') || url.endsWith('.bmp') || 
           url.endsWith('.svg');
  }

  canViewInBrowser(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    // Поддерживаем изображения, Word документы, PDF, PPTX/PPT, ODP
    return this.isImageFile(fileUrl) || 
           url.endsWith('.doc') || url.endsWith('.docx') || 
           url.endsWith('.pdf') || 
           url.endsWith('.pptx') || url.endsWith('.ppt') || 
           url.endsWith('.odp');
  }

  openInBrowser(certificate: Publication): void {
    const viewerUrl = this.getViewerUrl(certificate.fileUrl);
    if (viewerUrl) {
      // SafeResourceUrl имеет свойство changingThisBreaksApplicationSecurity для получения строки
      window.open((viewerUrl as any).changingThisBreaksApplicationSecurity || viewerUrl.toString(), '_blank');
    }
  }
}


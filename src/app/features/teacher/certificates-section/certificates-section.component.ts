import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { DocxViewerService } from '../../../core/services/docx-viewer.service';
import { Publication } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { environment } from '../../../../environments/environment';

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
  viewerFile: string | null = null;
  viewerFileName: string = '';
  viewerError: boolean = false;
  viewerDocxHtml: SafeHtml | null = null;
  isLoadingDocx: boolean = false;
  
  // Превью Word документов
  docxPreviews: Map<string, string> = new Map();
  loadingPreviews: Set<string> = new Set();
  
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
    private docxViewerService: DocxViewerService,
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
    if (!certificate.fileUrl) return;
    
    this.viewerFile = certificate.fileUrl;
    this.viewerFileName = this.getFileName(certificate.fileUrl);
    this.viewerError = false;
    this.viewerDocxHtml = null;
    this.isLoadingDocx = false;

    // Если это Word документ (.docx), загружаем и конвертируем его
    if (this.docxViewerService.isDocxFile(certificate.fileUrl)) {
      this.isLoadingDocx = true;
      this.docxViewerService.convertDocxToHtml(certificate.fileUrl).subscribe({
        next: (html) => {
          this.viewerDocxHtml = this.sanitizer.bypassSecurityTrustHtml(html);
          this.isLoadingDocx = false;
        },
        error: (error) => {
          console.error('Ошибка при конвертации Word документа:', error);
          this.viewerError = true;
          this.isLoadingDocx = false;
        },
      });
    }

    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerFile = null;
    this.viewerFileName = '';
    this.viewerError = false;
    this.viewerDocxHtml = null;
    this.isLoadingDocx = false;
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

  isImageFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.jpg') || url.endsWith('.jpeg') || url.endsWith('.png') || 
           url.endsWith('.gif') || url.endsWith('.webp') || url.endsWith('.bmp') || 
           url.endsWith('.svg');
  }

  isVideoFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') ||
           url.endsWith('.mov') || url.endsWith('.avi') || url.endsWith('.mkv');
  }

  isPdfFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    return fileUrl.toLowerCase().endsWith('.pdf');
  }

  isDocxFile(fileUrl: string): boolean {
    return this.docxViewerService.isDocxFile(fileUrl);
  }

  /**
   * Получает URL для просмотра файла в модальном окне.
   * Для изображений и видео возвращает прямой URL.
   * Для PDF и других файлов использует прокси.
   */
  getViewerUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;

    // Для изображений и видео возвращаем прокси URL, если путь относительный
    if (this.isImageFile(fileUrl) || this.isVideoFile(fileUrl)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.getPreviewUrl(fileUrl));
    }
    // Для PDF используем прокси URL для обхода проблем с CORS (без параметра download для просмотра)
    else if (this.isPdfFile(fileUrl)) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(this.getProxyUrl(fileUrl));
    }
    return null;
  }

  /**
   * Получает URL для превью файла (изображения, видео)
   * Использует прокси для относительных путей, прямой URL для полных
   */
  getPreviewUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    // Если это уже полный URL, возвращаем его
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    // Иначе, используем прокси
    return this.getProxyUrl(fileUrl);
  }

  /**
   * Получает прокси URL для просмотра файла (без параметра download)
   */
  private getProxyUrl(fileUrl: string): string {
    let relativePath = fileUrl;

    try {
      const url = new URL(fileUrl);
      relativePath = url.pathname.substring(1);
    } catch (e) {
      // Если не удалось распарсить как URL, используем как есть
    }

    // Используем прокси endpoint для просмотра (без download=true)
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(relativePath)}`;
  }

  /**
   * Получает URL для скачивания файла (через прокси с параметром download=true)
   */
  getDownloadUrl(fileUrl: string): string {
    let relativePath = fileUrl;

    try {
      const url = new URL(fileUrl);
      relativePath = url.pathname.substring(1);
    } catch (e) {
      // Если не удалось распарсить как URL, используем как есть
    }

    // Используем прокси endpoint для скачивания с download=true
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(relativePath)}&download=true`;
  }

  canViewInBrowser(fileUrl: string): boolean {
    if (!fileUrl) return false;
    // Поддерживаем изображения, видео, PDF и Word документы (.docx)
    return this.isImageFile(fileUrl) ||
           this.isVideoFile(fileUrl) ||
           this.isPdfFile(fileUrl) ||
           this.docxViewerService.isDocxFile(fileUrl);
  }

  getDocxPreview(fileUrl: string): string | null {
    return this.docxPreviews.get(fileUrl) || null;
  }

  loadDocxPreview(fileUrl: string): void {
    if (!this.docxViewerService.isDocxFile(fileUrl)) {
      return;
    }

    // Если превью уже загружено или загружается, не загружаем снова
    if (this.docxPreviews.has(fileUrl) || this.loadingPreviews.has(fileUrl)) {
      return;
    }

    this.loadingPreviews.add(fileUrl);
    this.docxViewerService.getDocxPreview(fileUrl, 400).subscribe({
      next: (preview) => {
        this.docxPreviews.set(fileUrl, preview);
        this.loadingPreviews.delete(fileUrl);
      },
      error: (error) => {
        console.error('Ошибка при загрузке превью Word документа:', error);
        this.docxPreviews.set(fileUrl, 'Не удалось загрузить превью');
        this.loadingPreviews.delete(fileUrl);
      },
    });
  }

  isLoadingPreview(fileUrl: string): boolean {
    return this.loadingPreviews.has(fileUrl);
  }

  openInBrowser(certificate: Publication): void {
    const viewerUrl = this.getViewerUrl(certificate.fileUrl);
    if (viewerUrl) {
      // SafeResourceUrl имеет свойство changingThisBreaksApplicationSecurity для получения строки
      window.open((viewerUrl as any).changingThisBreaksApplicationSecurity || viewerUrl.toString(), '_blank');
    }
  }
}


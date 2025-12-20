import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { forkJoin } from 'rxjs';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { DocxViewerService } from '../../../core/services/docx-viewer.service';
import { ParentSection } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';
import { environment } from '../../../../environments/environment';

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
        this.loadPublicSections();
      } else {
        this.isEditMode = true;
        this.loadOwnSections(true);
      }
    });
  }

  private resetPagination() {
    this.skip = 0;
    this.hasMore = true;
    this.sections = [];
  }

  loadPublicSections(reset = false) {
    if (!this.username || this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getParentSections(this.username, this.skip, this.take).subscribe({
      next: (sections) => {
        if (reset) {
          this.sections = sections;
        } else {
          this.sections = [...this.sections, ...sections];
        }

        this.hasMore = sections.length === this.take;
        this.skip += sections.length;
        this.isLoading = false;
        
        // Загружаем превью для всех Word документов
        this.loadPreviewsForSections(sections);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadOwnSections(reset = false) {
    if (this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getOwnParentSections(this.skip, this.take).subscribe({
      next: (sections) => {
        if (reset) {
          this.sections = sections;
        } else {
          this.sections = [...this.sections, ...sections];
        }

        this.hasMore = sections.length === this.take;
        this.skip += sections.length;
        this.isLoading = false;
        
        // Загружаем превью для всех Word документов
        this.loadPreviewsForSections(sections);
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  /**
   * Загружает превью для всех Word документов в секциях
   */
  private loadPreviewsForSections(sections: ParentSection[]): void {
    sections.forEach(section => {
      if (section.files && section.files.length > 0) {
        section.files.forEach(file => {
          if (this.docxViewerService.isDocxFile(file)) {
            this.loadDocxPreview(file);
          }
        });
      }
    });
  }

  private scrollTimeout: any = null;

  @HostListener('window:scroll', ['$event'])
  onScroll() {
    // Защита от множественных вызовов - используем debounce
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      if (this.isLoading || !this.hasMore) return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercent = (scrollTop + windowHeight) / documentHeight;

      // Загружаем следующую порцию, когда пользователь прокрутил на 80%
      if (scrollPercent > 0.8) {
        if (this.username) {
          this.loadPublicSections();
        } else {
          this.loadOwnSections(); // Убрал reset=true, чтобы не сбрасывать пагинацию
        }
      }
    }, 200); // Debounce 200ms
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
          this.loadOwnSections(true);
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
          this.loadOwnSections(true);
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
          this.loadOwnSections(true);
        },
      });
    }
  }

  isCardExpanded(sectionId: string): boolean {
    return this.expandedCards.has(sectionId);
  }

  toggleCardExpansion(sectionId: string): void {
    if (this.expandedCards.has(sectionId)) {
      this.expandedCards.delete(sectionId);
    } else {
      this.expandedCards.add(sectionId);
    }
  }

  shouldShowExpandButton(section: ParentSection): boolean {
    if (!section.content) return false;
    // Убираем HTML теги для подсчета длины
    const textContent = section.content.replace(/<[^>]*>/g, '');
    // Проверяем, что текст достаточно длинный для обрезки (примерно 150+ символов)
    return textContent.length > 150;
  }

  openModal(section: ParentSection): void {
    this.selectedSection = section;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
    
    // Загружаем превью для всех Word документов в модальном окне
    if (section.files && section.files.length > 0) {
      section.files.forEach(file => {
        if (this.docxViewerService.isDocxFile(file)) {
          this.loadDocxPreview(file);
        }
      });
    }
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

  getViewerUrl(fileUrl: string): SafeResourceUrl | null {
    if (!fileUrl) return null;
    
    const url = fileUrl.toLowerCase();
    let viewerUrl: string | null = null;
    
    // Для изображений используем прокси URL (если это относительный путь) или прямой URL (если полный)
    if (this.isImageFile(fileUrl)) {
      viewerUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://') 
        ? fileUrl 
        : this.getProxyUrl(fileUrl);
    }
    // Для видео используем прокси URL (если это относительный путь) или прямой URL (если полный)
    else if (this.isVideoFile(fileUrl)) {
      viewerUrl = fileUrl.startsWith('http://') || fileUrl.startsWith('https://') 
        ? fileUrl 
        : this.getProxyUrl(fileUrl);
    }
    // Для PDF используем прокси URL для обхода проблем с CORS (без параметра download для просмотра)
    else if (url.endsWith('.pdf')) {
      viewerUrl = this.getProxyUrl(fileUrl); // Используем прокси для просмотра (inline)
    }
    // Для Word документов (.docx) используем mammoth.js для конвертации в HTML
    // Для старых .doc файлов просмотр недоступен
    // Для других форматов не используем внешние сервисы
    
    return viewerUrl ? this.sanitizer.bypassSecurityTrustResourceUrl(viewerUrl) : null;
  }

  /**
   * Получает URL для превью изображения или видео
   */
  getPreviewUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    
    // Если это полный URL, используем его
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
      return fileUrl;
    }
    
    // Иначе используем прокси URL
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

  canViewInBrowser(fileUrl: string): boolean {
    if (!fileUrl) return false;
    const url = fileUrl.toLowerCase();
    // Поддерживаем изображения, видео, PDF и Word документы (.docx)
    return this.isImageFile(fileUrl) || 
           this.isVideoFile(fileUrl) ||
           url.endsWith('.pdf') || 
           this.docxViewerService.isDocxFile(fileUrl);
  }

  viewerPdfUrl: SafeResourceUrl | null = null;
  isLoadingPdf: boolean = false;

  openViewerModal(fileUrl: string): void {
    this.viewerFile = fileUrl;
    this.viewerFileName = this.getFileName(fileUrl);
    this.viewerError = false;
    this.viewerDocxHtml = null;
    this.isLoadingDocx = false;
    this.viewerPdfUrl = null;
    this.isLoadingPdf = false;
    
    // Если это Word документ (.docx), загружаем и конвертируем его
    if (this.docxViewerService.isDocxFile(fileUrl)) {
      this.isLoadingDocx = true;
      this.docxViewerService.convertDocxToHtml(fileUrl).subscribe({
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
    // Если это PDF, загружаем через blob URL для просмотра
    else if (this.isPdfFile(fileUrl)) {
      this.isLoadingPdf = true;
      const proxyUrl = this.getProxyUrl(fileUrl);
      
      fetch(proxyUrl)
        .then(response => response.blob())
        .then(blob => {
          const blobUrl = URL.createObjectURL(blob);
          this.viewerPdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl);
          this.isLoadingPdf = false;
        })
        .catch(error => {
          console.error('Ошибка при загрузке PDF:', error);
          this.viewerError = true;
          this.isLoadingPdf = false;
        });
    }
    
    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    // Освобождаем blob URL если он был создан
    if (this.viewerPdfUrl) {
      const url = this.viewerPdfUrl.toString();
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    }
    
    this.showViewerModal = false;
    this.viewerFile = null;
    this.viewerFileName = '';
    this.viewerError = false;
    this.viewerDocxHtml = null;
    this.isLoadingDocx = false;
    this.viewerPdfUrl = null;
    this.isLoadingPdf = false;
    document.body.style.overflow = '';
  }

  onViewerError(): void {
    this.viewerError = true;
  }

  isDocxFile(fileUrl: string): boolean {
    return this.docxViewerService.isDocxFile(fileUrl);
  }

  /**
   * Получает превью Word документа
   */
  getDocxPreview(fileUrl: string): string | null {
    return this.docxPreviews.get(fileUrl) || null;
  }

  /**
   * Загружает превью Word документа
   */
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

  /**
   * Проверяет, загружается ли превью
   */
  isLoadingPreview(fileUrl: string): boolean {
    return this.loadingPreviews.has(fileUrl);
  }

  /**
   * Получает URL для скачивания файла (через прокси)
   */
  getDownloadUrl(fileUrl: string): string {
    // Используем прокси для скачивания, чтобы обойти проблемы с CORS
    let relativePath = fileUrl;
    
    try {
      const url = new URL(fileUrl);
      relativePath = url.pathname.substring(1);
    } catch (e) {
      // Если не удалось распарсить как URL, используем как есть
    }
    
    // Используем прокси endpoint для скачивания (с параметром download=true)
    return `${environment.apiUrl}/upload/proxy?path=${encodeURIComponent(relativePath)}&download=true`;
  }

  /**
   * Проверяет, является ли файл PDF
   */
  isPdfFile(fileUrl: string): boolean {
    if (!fileUrl) return false;
    return fileUrl.toLowerCase().endsWith('.pdf');
  }

}




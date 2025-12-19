import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
  showViewerModal: boolean = false;
  viewerFile: string | null = null;
  viewerFileName: string = '';
  
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
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = (scrollTop + windowHeight) / documentHeight;

    // Загружаем следующую порцию, когда пользователь прокрутил на 80%
    if (scrollPercent > 0.8) {
      if (this.username) {
        this.loadPublicSections();
      } else {
        this.loadOwnSections(true);
      }
    }
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

  openViewerModal(fileUrl: string): void {
    this.viewerFile = fileUrl;
    this.viewerFileName = this.getFileName(fileUrl);
    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerFile = null;
    this.viewerFileName = '';
    document.body.style.overflow = '';
  }
}




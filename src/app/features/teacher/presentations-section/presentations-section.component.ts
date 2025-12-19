import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TeachersService } from '../../../core/services/teachers.service';
import { UploadService } from '../../../core/services/upload.service';
import { Presentation } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

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
  editingPresentationId: string | null = null;
  newPresentation: Partial<Presentation> = { title: '', description: '', fileUrl: '', cardColor: '' };
  selectedFile: File | null = null;
  useFileUpload = false;
  isUploading = false;
  placeholder = PlaceholderUtil;

  // Модальное окно
  showModal: boolean = false;
  selectedPresentation: Presentation | null = null;
  showViewerModal: boolean = false;
  viewerPresentation: Presentation | null = null;

  // Пагинация и бесконечный скролл
  private skip = 0;
  private readonly take = 5;
  hasMore = true;
  isLoading = false;
  
  // Развернутые карточки
  expandedCards: Set<string> = new Set();

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
        this.loadPublicPresentations(true);
      } else {
        this.isEditMode = true;
        this.loadOwnPresentations(true);
      }
    });
  }

  private resetPagination() {
    this.skip = 0;
    this.hasMore = true;
    this.presentations = [];
  }

  loadPublicPresentations(reset = false) {
    if (!this.username || this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getPresentations(this.username, this.skip, this.take).subscribe({
      next: (presentations) => {
        if (reset) {
          this.presentations = presentations;
        } else {
          this.presentations = [...this.presentations, ...presentations];
        }

        this.hasMore = presentations.length === this.take;
        this.skip += presentations.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  loadOwnPresentations(reset = false) {
    if (this.isLoading || (!this.hasMore && !reset)) return;

    if (reset) {
      this.resetPagination();
    }

    this.isLoading = true;
    this.teachersService.getOwnPresentations(this.skip, this.take).subscribe({
      next: (presentations) => {
        if (reset) {
          this.presentations = presentations;
        } else {
          this.presentations = [...this.presentations, ...presentations];
        }

        this.hasMore = presentations.length === this.take;
        this.skip += presentations.length;
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
        this.loadPublicPresentations();
      } else {
        this.loadOwnPresentations();
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
    this.newPresentation.fileUrl = '';
  }

  createPresentation() {
    if (!this.newPresentation.title) {
      alert('Пожалуйста, укажите название презентации');
      return;
    }

    this.continuePresentationCreation();
  }

  private continuePresentationCreation() {
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
        this.isUploading = false;
        return;
      }
      this.createPresentationWithUrl();
    }
  }

  private createPresentationWithUrl() {
    if (this.editingPresentationId) {
      this.teachersService.updatePresentation(this.editingPresentationId, this.newPresentation as any).subscribe({
        next: () => {
          this.loadOwnPresentations(true);
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
      this.teachersService.createPresentation(this.newPresentation as any).subscribe({
        next: () => {
          this.loadOwnPresentations(true);
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

  editPresentation(presentation: Presentation) {
    this.editingPresentationId = presentation.id;
    this.newPresentation = {
      title: presentation.title,
      description: presentation.description,
      fileUrl: presentation.fileUrl,
      cardColor: presentation.cardColor || '',
    };
    this.selectedFile = null;
    this.useFileUpload = false;
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingPresentationId = null;
    this.resetForm();
  }

  private resetForm() {
    this.newPresentation = { title: '', description: '', fileUrl: '', cardColor: '' };
    this.selectedFile = null;
    this.useFileUpload = false;
  }

  removeCardColor() {
    this.newPresentation.cardColor = '';
  }

  deletePresentation(id: string) {
    if (confirm('Удалить эту презентацию?')) {
      this.teachersService.deletePresentation(id).subscribe({
        next: () => {
          this.loadOwnPresentations(true);
        },
      });
    }
  }

  isCardExpanded(presentationId: string): boolean {
    return this.expandedCards.has(presentationId);
  }

  toggleCardExpansion(presentationId: string): void {
    if (this.expandedCards.has(presentationId)) {
      this.expandedCards.delete(presentationId);
    } else {
      this.expandedCards.add(presentationId);
    }
  }

  shouldShowExpandButton(presentation: Presentation): boolean {
    if (!presentation.description) return false;
    // Проверяем, что текст достаточно длинный для обрезки (примерно 150+ символов)
    return presentation.description.length > 150;
  }

  getTruncatedDescription(description: string | undefined): string {
    if (!description) return '';
    return description.length > 200 ? description.substring(0, 200) + '...' : description;
  }

  shouldShowFullButton(presentation: Presentation): boolean {
    // Показываем кнопку "Показать все" только если есть другие причины открыть модальное окно
    // Но не показываем, если уже есть кнопка развернуть/свернуть
    if (this.shouldShowExpandButton(presentation)) return false;
    return false; // В презентациях обычно не нужно открывать модальное окно, только развернуть текст
  }

  openModal(presentation: Presentation): void {
    this.selectedPresentation = presentation;
    this.showModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedPresentation = null;
    document.body.style.overflow = '';
  }

  openViewerModal(presentation: Presentation): void {
    this.viewerPresentation = presentation;
    this.showViewerModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeViewerModal(): void {
    this.showViewerModal = false;
    this.viewerPresentation = null;
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

  openInBrowser(presentation: Presentation): void {
    const viewerUrl = this.getViewerUrl(presentation.fileUrl);
    if (viewerUrl) {
      // SafeResourceUrl имеет свойство changingThisBreaksApplicationSecurity для получения строки
      window.open((viewerUrl as any).changingThisBreaksApplicationSecurity || viewerUrl.toString(), '_blank');
    }
  }
}




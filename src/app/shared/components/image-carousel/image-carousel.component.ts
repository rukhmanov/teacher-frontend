import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-image-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-carousel.component.html',
  styleUrl: './image-carousel.component.scss',
})
export class ImageCarouselComponent implements OnInit, OnDestroy {
  @Input() images: string[] = [];
  @Input() startIndex: number = 0;
  @Output() close = new EventEmitter<void>();

  currentIndex: number = 0;
  isFullscreen: boolean = false;
  PlaceholderUtil = PlaceholderUtil; // Для использования в шаблоне

  ngOnInit() {
    this.currentIndex = this.startIndex;
    document.body.style.overflow = 'hidden'; // Блокируем скролл страницы
  }

  ngOnDestroy() {
    document.body.style.overflow = ''; // Восстанавливаем скролл
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case 'ArrowLeft':
        this.previous();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'Escape':
        this.onClose();
        break;
    }
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
  }

  previous() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
  }

  goToIndex(index: number) {
    this.currentIndex = index;
  }

  onClose() {
    document.body.style.overflow = '';
    this.close.emit();
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = PlaceholderUtil.getPostImagePlaceholder();
    }
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
  }
}


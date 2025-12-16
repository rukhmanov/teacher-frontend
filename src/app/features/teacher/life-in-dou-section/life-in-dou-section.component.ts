import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { LifeInDOU } from '../../../core/models/teacher.interface';
import { PlaceholderUtil } from '../../../core/utils/placeholder.util';

@Component({
  selector: 'app-life-in-dou-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './life-in-dou-section.component.html',
  styleUrl: './life-in-dou-section.component.scss',
})
export class LifeInDOUSectionComponent implements OnInit {
  lifeInDOU: LifeInDOU[] = [];
  username: string = '';
  isEditMode = false;
  showForm = false;
  newItem: Partial<LifeInDOU> = { title: '', description: '' };
  placeholder = PlaceholderUtil;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
  ) {}

  ngOnInit() {
    // username находится в родительском роуте для публичных страниц
    this.route.parent?.params.subscribe((parentParams) => {
      this.username = parentParams['username'];
      if (this.username) {
        this.loadPublicLifeInDOU();
      } else {
        this.isEditMode = true;
        this.loadOwnLifeInDOU();
      }
    });
  }

  loadPublicLifeInDOU() {
    if (this.username) {
      this.teachersService.getLifeInDOU(this.username).subscribe({
        next: (items) => {
          this.lifeInDOU = items;
        },
      });
    }
  }

  loadOwnLifeInDOU() {
    this.teachersService.getOwnLifeInDOU().subscribe({
      next: (items) => {
        this.lifeInDOU = items;
      },
    });
  }

  createItem() {
    this.teachersService.createLifeInDOU(this.newItem as any).subscribe({
      next: () => {
        this.loadOwnLifeInDOU();
        this.showForm = false;
        this.newItem = { title: '', description: '' };
      },
    });
  }

  deleteItem(id: string) {
    if (confirm('Удалить этот элемент?')) {
      this.teachersService.deleteLifeInDOU(id).subscribe({
        next: () => {
          this.loadOwnLifeInDOU();
        },
      });
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.placeholder.getGalleryPlaceholder();
    }
  }
}


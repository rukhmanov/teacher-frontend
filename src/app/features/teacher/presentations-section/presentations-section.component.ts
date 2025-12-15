import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
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

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
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

  createPresentation() {
    this.teachersService.createPresentation(this.newPresentation as any).subscribe({
      next: () => {
        this.loadOwnPresentations();
        this.showForm = false;
        this.newPresentation = { title: '', description: '', fileUrl: '' };
      },
    });
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

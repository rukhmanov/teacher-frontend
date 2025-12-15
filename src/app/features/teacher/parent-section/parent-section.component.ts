import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { ParentSection } from '../../../core/models/teacher.interface';

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
  newSection: Partial<ParentSection> = { title: '', content: '' };

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
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
    this.teachersService.createParentSection(this.newSection as any).subscribe({
      next: () => {
        this.loadOwnSections();
        this.showForm = false;
        this.newSection = { title: '', content: '' };
      },
    });
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
}

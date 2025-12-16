import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  newSection: Partial<ParentSection> = { title: '', content: '', cardColor: '' };
  placeholder = PlaceholderUtil;
  isUploading = false;

  constructor(
    private route: ActivatedRoute,
    private teachersService: TeachersService,
    private uploadService: UploadService,
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
    this.submitSection();
  }

  private submitSection() {
    if (this.editingSectionId) {
      this.teachersService.updateParentSection(this.editingSectionId, this.newSection as any).subscribe({
        next: () => {
          this.loadOwnSections();
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
          this.loadOwnSections();
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
    };
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingSectionId = null;
    this.newSection = { title: '', content: '', cardColor: '' };
  }

  removeCardColor() {
    this.newSection.cardColor = '';
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


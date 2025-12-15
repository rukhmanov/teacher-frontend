import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TeachersService } from '../../../core/services/teachers.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post, TeacherProfile } from '../../../core/models/teacher.interface';

@Component({
  selector: 'app-home-section',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-section.component.html',
  styleUrl: './home-section.component.scss',
})
export class HomeSectionComponent implements OnInit {
  posts: Post[] = [];
  teacher: TeacherProfile | null = null;
  username: string = '';
  isEditMode = false;
  showPostForm = false;
  newPost = {
    title: '',
    content: '',
    images: [] as string[],
    videos: [] as string[],
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private teachersService: TeachersService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.route.params.subscribe((params) => {
      this.username = params['username'];
      if (this.username) {
        this.loadPublicPosts();
      } else {
        this.isEditMode = true;
        this.loadOwnPosts();
        this.loadOwnProfile();
      }
    });
  }

  loadPublicPosts() {
    if (this.username) {
      this.teachersService.getPosts(this.username).subscribe({
        next: (posts) => {
          this.posts = posts;
        },
      });
    }
  }

  loadOwnPosts() {
    this.teachersService.getOwnPosts().subscribe({
      next: (posts) => {
        this.posts = posts;
      },
    });
  }

  loadOwnProfile() {
    this.teachersService.getOwnProfile().subscribe({
      next: (teacher) => {
        this.teacher = teacher;
      },
    });
  }

  createPost() {
    this.teachersService.createPost(this.newPost).subscribe({
      next: () => {
        this.loadOwnPosts();
        this.showPostForm = false;
        this.newPost = { title: '', content: '', images: [], videos: [] };
      },
    });
  }

  deletePost(id: string) {
    if (confirm('Удалить этот пост?')) {
      this.teachersService.deletePost(id).subscribe({
        next: () => {
          this.loadOwnPosts();
        },
      });
    }
  }
}

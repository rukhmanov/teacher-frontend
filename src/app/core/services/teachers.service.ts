import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TeacherProfile,
  Post,
  MasterClass,
  Presentation,
  ParentSection,
  LifeInDOU,
  SocialLink,
  Review,
  CreateReviewRequest,
  Folder,
  CreateFolderRequest,
  MediaItem,
} from '../models/teacher.interface';

@Injectable({
  providedIn: 'root',
})
export class TeachersService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllTeachers(): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.apiUrl}/teachers`);
  }

  getTeacherByUsername(username: string): Observable<TeacherProfile> {
    return this.http.get<TeacherProfile>(
      `${this.apiUrl}/teachers/${username}`,
    );
  }

  getOwnProfile(): Observable<TeacherProfile> {
    return this.http.get<TeacherProfile>(`${this.apiUrl}/teachers/me/profile`);
  }

  updateProfile(data: Partial<TeacherProfile>): Observable<TeacherProfile> {
    return this.http.put<TeacherProfile>(
      `${this.apiUrl}/teachers/me/profile`,
      data,
    );
  }

  deleteProfile(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teachers/me/profile`);
  }

  // Posts
  getPosts(username: string): Observable<Post[]>;
  getPosts(teacherId?: string): Observable<Post[]>;
  getPosts(usernameOrTeacherId?: string): Observable<Post[]> {
    if (usernameOrTeacherId) {
      return this.http.get<Post[]>(
        `${this.apiUrl}/teachers/${usernameOrTeacherId}/posts`,
      );
    }
    return this.http.get<Post[]>(`${this.apiUrl}/teachers/me/posts`);
  }

  getOwnPosts(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.apiUrl}/teachers/me/posts`);
  }

  createPost(data: Partial<Post>): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/teachers/me/posts`, data);
  }

  updatePost(id: string, data: Partial<Post>): Observable<Post> {
    return this.http.put<Post>(
      `${this.apiUrl}/teachers/me/posts/${id}`,
      data,
    );
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teachers/me/posts/${id}`);
  }

  // Master Classes
  getMasterClasses(username: string): Observable<MasterClass[]>;
  getMasterClasses(teacherId?: string): Observable<MasterClass[]>;
  getMasterClasses(usernameOrTeacherId?: string): Observable<MasterClass[]> {
    if (usernameOrTeacherId) {
      return this.http.get<MasterClass[]>(
        `${this.apiUrl}/teachers/${usernameOrTeacherId}/master-classes`,
      );
    }
    return this.http.get<MasterClass[]>(
      `${this.apiUrl}/teachers/me/master-classes`,
    );
  }

  getOwnMasterClasses(): Observable<MasterClass[]> {
    return this.http.get<MasterClass[]>(
      `${this.apiUrl}/teachers/me/master-classes`,
    );
  }

  createMasterClass(data: Partial<MasterClass>): Observable<MasterClass> {
    return this.http.post<MasterClass>(
      `${this.apiUrl}/teachers/me/master-classes`,
      data,
    );
  }

  updateMasterClass(
    id: string,
    data: Partial<MasterClass>,
  ): Observable<MasterClass> {
    return this.http.put<MasterClass>(
      `${this.apiUrl}/teachers/me/master-classes/${id}`,
      data,
    );
  }

  deleteMasterClass(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/teachers/me/master-classes/${id}`,
    );
  }

  // Presentations
  getPresentations(username: string): Observable<Presentation[]>;
  getPresentations(teacherId?: string): Observable<Presentation[]>;
  getPresentations(
    usernameOrTeacherId?: string,
  ): Observable<Presentation[]> {
    if (usernameOrTeacherId) {
      return this.http.get<Presentation[]>(
        `${this.apiUrl}/teachers/${usernameOrTeacherId}/presentations`,
      );
    }
    return this.http.get<Presentation[]>(
      `${this.apiUrl}/teachers/me/presentations`,
    );
  }

  getOwnPresentations(): Observable<Presentation[]> {
    return this.http.get<Presentation[]>(
      `${this.apiUrl}/teachers/me/presentations`,
    );
  }

  createPresentation(data: Partial<Presentation>): Observable<Presentation> {
    return this.http.post<Presentation>(
      `${this.apiUrl}/teachers/me/presentations`,
      data,
    );
  }

  updatePresentation(
    id: string,
    data: Partial<Presentation>,
  ): Observable<Presentation> {
    return this.http.put<Presentation>(
      `${this.apiUrl}/teachers/me/presentations/${id}`,
      data,
    );
  }

  deletePresentation(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/teachers/me/presentations/${id}`,
    );
  }

  // Parent Sections
  getParentSections(username: string): Observable<ParentSection[]>;
  getParentSections(teacherId?: string): Observable<ParentSection[]>;
  getParentSections(
    usernameOrTeacherId?: string,
  ): Observable<ParentSection[]> {
    if (usernameOrTeacherId) {
      return this.http.get<ParentSection[]>(
        `${this.apiUrl}/teachers/${usernameOrTeacherId}/parents`,
      );
    }
    return this.http.get<ParentSection[]>(
      `${this.apiUrl}/teachers/me/parents`,
    );
  }

  getOwnParentSections(): Observable<ParentSection[]> {
    return this.http.get<ParentSection[]>(
      `${this.apiUrl}/teachers/me/parents`,
    );
  }

  createParentSection(data: Partial<ParentSection>): Observable<ParentSection> {
    return this.http.post<ParentSection>(
      `${this.apiUrl}/teachers/me/parents`,
      data,
    );
  }

  updateParentSection(
    id: string,
    data: Partial<ParentSection>,
  ): Observable<ParentSection> {
    return this.http.put<ParentSection>(
      `${this.apiUrl}/teachers/me/parents/${id}`,
      data,
    );
  }

  deleteParentSection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teachers/me/parents/${id}`);
  }

  // Life in DOU
  getLifeInDOU(username: string): Observable<LifeInDOU> {
    return this.http.get<LifeInDOU>(
      `${this.apiUrl}/teachers/${username}/life`,
    );
  }

  getOwnLifeInDOU(): Observable<LifeInDOU> {
    return this.http.get<LifeInDOU>(`${this.apiUrl}/teachers/me/life`);
  }

  addMediaToLifeInDOU(mediaItem: { type: 'photo' | 'video'; url: string; caption?: string }): Observable<LifeInDOU> {
    return this.http.post<LifeInDOU>(`${this.apiUrl}/teachers/me/life/media`, mediaItem);
  }

  removeMediaFromLifeInDOU(url: string): Observable<LifeInDOU> {
    return this.http.request<LifeInDOU>('DELETE', `${this.apiUrl}/teachers/me/life/media`, {
      body: { url },
    });
  }

  // Social Links
  getSocialLinks(username: string): Observable<SocialLink[]>;
  getSocialLinks(teacherId?: string): Observable<SocialLink[]>;
  getSocialLinks(usernameOrTeacherId?: string): Observable<SocialLink[]> {
    if (usernameOrTeacherId) {
      return this.http.get<SocialLink[]>(
        `${this.apiUrl}/teachers/${usernameOrTeacherId}/social-links`,
      );
    }
    return this.http.get<SocialLink[]>(
      `${this.apiUrl}/teachers/me/social-links`,
    );
  }

  getOwnSocialLinks(): Observable<SocialLink[]> {
    return this.http.get<SocialLink[]>(
      `${this.apiUrl}/teachers/me/social-links`,
    );
  }

  addSocialLink(data: Partial<SocialLink>): Observable<SocialLink> {
    return this.http.post<SocialLink>(
      `${this.apiUrl}/teachers/me/social-links`,
      data,
    );
  }

  updateSocialLink(id: string, data: Partial<SocialLink>): Observable<SocialLink> {
    return this.http.put<SocialLink>(
      `${this.apiUrl}/teachers/me/social-links/${id}`,
      data,
    );
  }

  deleteSocialLink(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/teachers/me/social-links/${id}`,
    );
  }

  // Reviews
  getReviews(username: string): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/teachers/${username}/reviews`);
  }

  createReview(username: string, data: CreateReviewRequest): Observable<Review> {
    return this.http.post<Review>(
      `${this.apiUrl}/teachers/${username}/reviews`,
      data,
    );
  }

  deleteReview(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teachers/me/reviews/${id}`);
  }

  // Folders
  getFolders(username: string): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiUrl}/teachers/${username}/folders`);
  }

  getOwnFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.apiUrl}/teachers/me/folders`);
  }

  createFolder(data: CreateFolderRequest): Observable<Folder> {
    return this.http.post<Folder>(`${this.apiUrl}/teachers/me/folders`, data);
  }

  updateFolder(id: string, name: string): Observable<Folder> {
    return this.http.put<Folder>(`${this.apiUrl}/teachers/me/folders/${id}`, { name });
  }

  addMediaToFolder(id: string, mediaItem: MediaItem): Observable<Folder> {
    return this.http.post<Folder>(`${this.apiUrl}/teachers/me/folders/${id}/media`, mediaItem);
  }

  removeMediaFromFolder(id: string, url: string): Observable<Folder> {
    return this.http.delete<Folder>(`${this.apiUrl}/teachers/me/folders/${id}/media`, {
      body: { url },
    });
  }

  deleteFolder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/teachers/me/folders/${id}`);
  }
}




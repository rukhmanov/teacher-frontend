import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  TeacherProfile,
  Post,
  MasterClass,
  Presentation,
  Publication,
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
  getPosts(
    usernameOrTeacherId?: string,
    skip?: number,
    take?: number,
  ): Observable<Post[]> {
    let url = '';
    if (usernameOrTeacherId) {
      url = `${this.apiUrl}/teachers/${usernameOrTeacherId}/posts`;
    } else {
      url = `${this.apiUrl}/teachers/me/posts`;
    }

    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<Post[]>(url, { params });
  }

  getOwnPosts(skip?: number, take?: number): Observable<Post[]> {
    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<Post[]>(`${this.apiUrl}/teachers/me/posts`, { params });
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
  getMasterClasses(
    usernameOrTeacherId?: string,
    skip?: number,
    take?: number,
  ): Observable<MasterClass[]> {
    let url = '';
    if (usernameOrTeacherId) {
      url = `${this.apiUrl}/teachers/${usernameOrTeacherId}/master-classes`;
    } else {
      url = `${this.apiUrl}/teachers/me/master-classes`;
    }

    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<MasterClass[]>(url, { params });
  }

  getOwnMasterClasses(skip?: number, take?: number): Observable<MasterClass[]> {
    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<MasterClass[]>(
      `${this.apiUrl}/teachers/me/master-classes`,
      { params },
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
  getPresentations(
    usernameOrTeacherId?: string,
    skip?: number,
    take?: number,
  ): Observable<Presentation[]> {
    let url = '';
    if (usernameOrTeacherId) {
      url = `${this.apiUrl}/teachers/${usernameOrTeacherId}/presentations`;
    } else {
      url = `${this.apiUrl}/teachers/me/presentations`;
    }

    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<Presentation[]>(url, { params });
  }

  getOwnPresentations(skip?: number, take?: number): Observable<Presentation[]> {
    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<Presentation[]>(
      `${this.apiUrl}/teachers/me/presentations`,
      { params },
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

  // Publications
  getPublications(
    usernameOrTeacherId?: string,
    skip?: number,
    take?: number,
    type?: string,
  ): Observable<Publication[]> {
    let url = '';
    if (usernameOrTeacherId) {
      url = `${this.apiUrl}/teachers/${usernameOrTeacherId}/publications`;
    } else {
      url = `${this.apiUrl}/teachers/me/publications`;
    }

    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();
    if (type !== undefined) params.type = type;

    return this.http.get<Publication[]>(url, { params });
  }

  getOwnPublications(skip?: number, take?: number, type?: string): Observable<Publication[]> {
    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();
    if (type !== undefined) params.type = type;

    return this.http.get<Publication[]>(
      `${this.apiUrl}/teachers/me/publications`,
      { params },
    );
  }

  createPublication(data: Partial<Publication>): Observable<Publication> {
    return this.http.post<Publication>(
      `${this.apiUrl}/teachers/me/publications`,
      data,
    );
  }

  updatePublication(
    id: string,
    data: Partial<Publication>,
  ): Observable<Publication> {
    return this.http.put<Publication>(
      `${this.apiUrl}/teachers/me/publications/${id}`,
      data,
    );
  }

  deletePublication(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/teachers/me/publications/${id}`,
    );
  }

  // Certificates
  getCertificates(
    usernameOrTeacherId?: string,
    skip?: number,
    take?: number,
  ): Observable<Publication[]> {
    let url = '';
    if (usernameOrTeacherId) {
      url = `${this.apiUrl}/teachers/${usernameOrTeacherId}/certificates`;
    } else {
      url = `${this.apiUrl}/teachers/me/certificates`;
    }

    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<Publication[]>(url, { params });
  }

  getOwnCertificates(skip?: number, take?: number): Observable<Publication[]> {
    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<Publication[]>(
      `${this.apiUrl}/teachers/me/certificates`,
      { params },
    );
  }

  // Parent Sections
  getParentSections(
    usernameOrTeacherId?: string,
    skip?: number,
    take?: number,
  ): Observable<ParentSection[]> {
    let url = '';
    if (usernameOrTeacherId) {
      url = `${this.apiUrl}/teachers/${usernameOrTeacherId}/parents`;
    } else {
      url = `${this.apiUrl}/teachers/me/parents`;
    }

    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<ParentSection[]>(url, { params });
  }

  getOwnParentSections(skip?: number, take?: number): Observable<ParentSection[]> {
    const params: any = {};
    if (skip !== undefined) params.skip = skip.toString();
    if (take !== undefined) params.take = take.toString();

    return this.http.get<ParentSection[]>(
      `${this.apiUrl}/teachers/me/parents`,
      { params },
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

  moveMedia(
    mediaItem: MediaItem,
    sourceFolderId: string | null,
    targetFolderId: string | null,
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/teachers/me/life/move-media`, {
      ...mediaItem,
      sourceFolderId: sourceFolderId || null,
      targetFolderId: targetFolderId || null,
    });
  }
}





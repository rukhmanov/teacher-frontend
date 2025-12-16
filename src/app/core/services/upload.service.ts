import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<{ url: string }> {
    if (!file) {
      throw new Error('File is required');
    }
    
    const formData = new FormData();
    formData.append('file', file, file.name);
    
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload/image`, formData, {
      reportProgress: false,
    });
  }

  uploadFile(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload/file`, formData);
  }
}


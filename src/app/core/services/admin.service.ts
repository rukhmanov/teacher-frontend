import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TeacherProfile, WhitelistEmail } from '../models/teacher.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAllTeachers(): Observable<TeacherProfile[]> {
    return this.http.get<TeacherProfile[]>(`${this.apiUrl}/admin/teachers`);
  }

  updateTeacher(
    id: string,
    data: Partial<TeacherProfile>,
  ): Observable<TeacherProfile> {
    return this.http.put<TeacherProfile>(
      `${this.apiUrl}/admin/teachers/${id}`,
      data,
    );
  }

  getWhitelist(): Observable<WhitelistEmail[]> {
    return this.http.get<WhitelistEmail[]>(`${this.apiUrl}/admin/whitelist`);
  }

  addToWhitelist(email: string): Observable<WhitelistEmail> {
    return this.http.post<WhitelistEmail>(`${this.apiUrl}/admin/whitelist`, {
      email,
    });
  }

  removeFromWhitelist(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/whitelist/${id}`);
  }
}



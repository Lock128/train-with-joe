import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { ProfileCardData } from '../models/profile-card.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ProfileCardService {
  private baseUrl = environment.apiBaseUrl ? `${environment.apiBaseUrl}/users` : '/users';

  constructor(private http: HttpClient) {}

  fetchProfileCard(userId: string): Observable<ProfileCardData> {
    return this.http.get<ProfileCardData>(`${this.baseUrl}/${userId}.json`);
  }
}

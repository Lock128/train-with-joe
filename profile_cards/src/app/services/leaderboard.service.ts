import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import type { LeaderboardData, PostLeaderboardData } from '../models/leaderboard.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private baseUrl = environment.apiBaseUrl ? `${environment.apiBaseUrl}/leaderboard` : '/leaderboard';

  constructor(private http: HttpClient) {}

  fetchLeaderboard(
    type:
      | 'unique-posts'
      | 'total-posts'
      | 'ai-usage'
      | 'current-streak'
      | 'longest-streak'
      | 'posts-by-tag'
      | 'links-shared'
      | 'likes'
      | 'impressions'
      | 'links-shared-x'
      | 'likes-x'
      | 'impressions-x'
      | 'links-shared-linkedin'
      | 'likes-linkedin'
      | 'impressions-linkedin'
      | 'links-shared-bluesky'
      | 'likes-bluesky'
      | 'impressions-bluesky'
      | 'links-shared-tiktok'
      | 'likes-tiktok'
      | 'impressions-tiktok',
  ): Observable<LeaderboardData> {
    return this.http.get<LeaderboardData>(`${this.baseUrl}/${type}.json`);
  }

  fetchLeaderboardByTag(tagName: string): Observable<LeaderboardData> {
    return this.http.get<LeaderboardData>(`${this.baseUrl}/posts-by-tag/${tagName}.json`);
  }

  // NEW: Fetch post leaderboards
  fetchPostLeaderboard(
    type: 'top-posts-links' | 'top-posts-likes' | 'top-posts-impressions',
  ): Observable<PostLeaderboardData> {
    return this.http.get<PostLeaderboardData>(`${this.baseUrl}/${type}.json`);
  }

  fetchTagsIndex(): Observable<{
    tags: Array<{ name: string; postCount: number; userCount: number }>;
    totalTags: number;
    generatedAt: string;
  }> {
    return this.http.get<{
      tags: Array<{ name: string; postCount: number; userCount: number }>;
      totalTags: number;
      generatedAt: string;
    }>(`${this.baseUrl}/tags/index.json`);
  }
}

/**
 * Unit tests for LeaderboardService
 */

import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LeaderboardService } from './leaderboard.service';
import type { LeaderboardData } from '../models/leaderboard.model';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let httpClient: { get: ReturnType<typeof vi.fn> };

  const mockPostsLeaderboard: LeaderboardData = {
    type: 'posts',
    generatedAt: '2024-11-10T00:00:00Z',
    entries: [
      {
        rank: 1,
        userId: 'user1',
        displayName: 'Top User',
        value: 100,
        profileCardUrl: 'https://cards.example.com/user1',
      },
    ],
  };

  const mockAIUsageLeaderboard: LeaderboardData = {
    type: 'ai-usage',
    generatedAt: '2024-11-10T00:00:00Z',
    entries: [
      {
        rank: 1,
        userId: 'user2',
        displayName: 'AI User',
        value: 200,
        profileCardUrl: 'https://cards.example.com/user2',
      },
    ],
  };

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
    };

    service = new LeaderboardService(httpClient as unknown as HttpClient);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch posts leaderboard', async () => {
    httpClient.get.mockReturnValue(of(mockPostsLeaderboard));

    const data = await new Promise<LeaderboardData>((resolve) => {
      service.fetchLeaderboard('posts').subscribe((data) => {
        resolve(data);
      });
    });

    expect(data).toEqual(mockPostsLeaderboard);
    expect(data.type).toBe('posts');
    expect(httpClient.get).toHaveBeenCalledWith('/assets/mock-data/leaderboard/posts.json');
  });

  it('should fetch AI usage leaderboard', async () => {
    httpClient.get.mockReturnValue(of(mockAIUsageLeaderboard));

    const data = await new Promise<LeaderboardData>((resolve) => {
      service.fetchLeaderboard('ai-usage').subscribe((data) => {
        resolve(data);
      });
    });

    expect(data).toEqual(mockAIUsageLeaderboard);
    expect(data.type).toBe('ai-usage');
    expect(httpClient.get).toHaveBeenCalledWith('/assets/mock-data/leaderboard/ai-usage.json');
  });

  it('should handle HTTP errors', async () => {
    const error = { status: 404, statusText: 'Not Found' };
    httpClient.get.mockReturnValue(throwError(() => error));

    try {
      await new Promise<LeaderboardData>((resolve, reject) => {
        service.fetchLeaderboard('posts').subscribe({
          next: resolve,
          error: reject,
        });
      });
      throw new Error('should have failed with 404 error');
    } catch (err: any) {
      expect(err.status).toBe(404);
    }
  });

  it('should handle network errors', async () => {
    const networkError = { error: { type: 'error' }, message: 'Network error' };
    httpClient.get.mockReturnValue(throwError(() => networkError));

    try {
      await new Promise<LeaderboardData>((resolve, reject) => {
        service.fetchLeaderboard('posts').subscribe({
          next: resolve,
          error: reject,
        });
      });
      throw new Error('should have failed with network error');
    } catch (error: any) {
      expect(error.error.type).toBe('error');
    }
  });

  it('should make separate requests for different leaderboard types', () => {
    httpClient.get.mockReturnValue(of(mockPostsLeaderboard));

    service.fetchLeaderboard('posts').subscribe();
    service.fetchLeaderboard('ai-usage').subscribe();

    expect(httpClient.get).toHaveBeenCalledWith('/assets/mock-data/leaderboard/posts.json');
    expect(httpClient.get).toHaveBeenCalledWith('/assets/mock-data/leaderboard/ai-usage.json');
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('should handle empty leaderboard', async () => {
    const emptyLeaderboard: LeaderboardData = {
      type: 'posts',
      generatedAt: '2024-11-10T00:00:00Z',
      entries: [],
    };
    httpClient.get.mockReturnValue(of(emptyLeaderboard));

    const data = await new Promise<LeaderboardData>((resolve) => {
      service.fetchLeaderboard('posts').subscribe((data) => {
        resolve(data);
      });
    });

    expect(data.entries.length).toBe(0);
  });

  it('should construct correct URL for leaderboard type', () => {
    httpClient.get.mockReturnValue(of(mockPostsLeaderboard));

    service.fetchLeaderboard('posts').subscribe();

    expect(httpClient.get).toHaveBeenCalledWith('/assets/mock-data/leaderboard/posts.json');
  });
});

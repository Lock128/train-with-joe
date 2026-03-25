/**
 * Unit tests for ProfileCardService
 */

import { HttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfileCardService } from './profile-card.service';
import type { ProfileCardData } from '../models/profile-card.model';

describe('ProfileCardService', () => {
  let service: ProfileCardService;
  let httpClient: { get: ReturnType<typeof vi.fn> };

  const mockProfileData: ProfileCardData = {
    userId: 'test-user-1',
    displayName: 'Test User',
    joinDate: '2024-01-01T00:00:00Z',
    metrics: {
      uniquePosts: 42,
      totalPostsAcrossNetworks: 100,
      connectedPlatforms: 3,
      currentStreak: 5,
      longestStreak: 10,
      totalAIUsage: 15,
      aiPostGeneration: 5,
      aiTextEnhancement: 4,
      aiScheduling: 3,
      aiTagSuggestion: 3,
      totalLinksShared: 250,
      totalLikes: 1500,
      totalImpressions: 50000,
    },
    recentPosts: [],
    rankings: {
      uniquePostsRank: 5,
      totalPostsRank: 3,
      aiUsageRank: 10,
      linksSharedRank: 8,
      likesRank: 12,
      impressionsRank: 15,
    },
    lastUpdated: '2024-11-10T00:00:00Z',
    profileCardVersion: '1.0',
  };

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
    };

    service = new ProfileCardService(httpClient as unknown as HttpClient);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch profile card data', async () => {
    const userId = 'test-user-1';
    httpClient.get.mockReturnValue(of(mockProfileData));

    const data = await new Promise<ProfileCardData>((resolve) => {
      service.fetchProfileCard(userId).subscribe((data) => {
        resolve(data);
      });
    });

    expect(data).toEqual(mockProfileData);
    expect(httpClient.get).toHaveBeenCalledWith(`/assets/mock-data/users/${userId}.json`);
  });

  it('should handle HTTP errors', async () => {
    const userId = 'test-user-1';
    const error = { status: 404, statusText: 'Not Found' };
    httpClient.get.mockReturnValue(throwError(() => error));

    try {
      await new Promise<ProfileCardData>((resolve, reject) => {
        service.fetchProfileCard(userId).subscribe({
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
    const userId = 'test-user-1';
    const networkError = { error: { type: 'error' }, message: 'Network error' };
    httpClient.get.mockReturnValue(throwError(() => networkError));

    try {
      await new Promise<ProfileCardData>((resolve, reject) => {
        service.fetchProfileCard(userId).subscribe({
          next: resolve,
          error: reject,
        });
      });
      throw new Error('should have failed with network error');
    } catch (error: any) {
      expect(error.error.type).toBe('error');
    }
  });

  it('should make multiple requests for different users', () => {
    const userId1 = 'user1';
    const userId2 = 'user2';
    httpClient.get.mockReturnValue(of(mockProfileData));

    service.fetchProfileCard(userId1).subscribe();
    service.fetchProfileCard(userId2).subscribe();

    expect(httpClient.get).toHaveBeenCalledWith(`/assets/mock-data/users/${userId1}.json`);
    expect(httpClient.get).toHaveBeenCalledWith(`/assets/mock-data/users/${userId2}.json`);
    expect(httpClient.get).toHaveBeenCalledTimes(2);
  });

  it('should construct correct URL for user ID', () => {
    const userId = 'test-user-123';
    httpClient.get.mockReturnValue(of(mockProfileData));

    service.fetchProfileCard(userId).subscribe();

    expect(httpClient.get).toHaveBeenCalledWith('/assets/mock-data/users/test-user-123.json');
  });
});

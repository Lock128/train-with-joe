/**
 * Unit tests for ProfileCardComponent
 */

import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfileCardComponent } from './profile-card.component';
import { ProfileCardService } from '../../services/profile-card.service';
import { MetaService } from '../../services/meta.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { ProfileCardData } from '../../models/profile-card.model';

describe('ProfileCardComponent', () => {
  let component: ProfileCardComponent;
  let profileCardService: { fetchProfileCard: ReturnType<typeof vi.fn> };
  let metaService: { setProfileCardTags: ReturnType<typeof vi.fn>; setDefaultTags: ReturnType<typeof vi.fn> };
  let analyticsService: {
    trackProfileCardView: ReturnType<typeof vi.fn>;
    trackLoadTime: ReturnType<typeof vi.fn>;
    trackError: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };

  const mockProfileData: ProfileCardData = {
    userId: 'test-user-1',
    displayName: 'Test User',
    joinDate: '2024-01-01T00:00:00Z',
    metrics: {
      totalPosts: 42,
      connectedPlatforms: 3,
      currentStreak: 5,
      longestStreak: 10,
      totalAIUsage: 15,
      aiPostGeneration: 5,
      aiTextEnhancement: 4,
      aiScheduling: 3,
      aiTagSuggestion: 3,
    },
    recentPosts: [
      {
        postId: 'POST#1',
        title: 'Test Post',
        content: 'This is a test post',
        publishedAt: '2024-11-10T00:00:00Z',
        platforms: [
          {
            network: 'X',
            url: 'https://x.com/testuser',
            handle: '@testuser',
          },
        ],
      },
    ],
    rankings: {
      postRank: 5,
      aiUsageRank: 10,
    },
    lastUpdated: '2024-11-10T00:00:00Z',
    profileCardVersion: '1.0',
  };

  beforeEach(() => {
    profileCardService = {
      fetchProfileCard: vi.fn(),
    };

    metaService = {
      setProfileCardTags: vi.fn(),
      setDefaultTags: vi.fn(),
    };

    analyticsService = {
      trackProfileCardView: vi.fn(),
      trackLoadTime: vi.fn(),
      trackError: vi.fn(),
    };

    router = {
      navigate: vi.fn(),
    };

    const activatedRoute = {
      paramMap: of({
        get: (key: string) => (key === 'userId' ? 'test-user-1' : null),
        has: (key: string) => key === 'userId',
        keys: ['userId'],
        getAll: () => [],
      }),
    } as unknown as ActivatedRoute;

    component = new ProfileCardComponent(
      activatedRoute,
      router as unknown as Router,
      profileCardService as unknown as ProfileCardService,
      metaService as unknown as MetaService,
      analyticsService as unknown as AnalyticsService,
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load profile card data on init', async () => {
    profileCardService.fetchProfileCard.mockReturnValue(of(mockProfileData));

    component.ngOnInit();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(profileCardService.fetchProfileCard).toHaveBeenCalledWith('test-user-1');
    expect(component.profileData).toEqual(mockProfileData);
    expect(component.loading).toBe(false);
    expect(component.error).toBeNull();
    expect(metaService.setProfileCardTags).toHaveBeenCalledWith(mockProfileData, 'test-user-1');
    expect(analyticsService.trackProfileCardView).toHaveBeenCalledWith('test-user-1', '');
  });

  it('should handle loading state', async () => {
    expect(component.loading).toBe(true);

    profileCardService.fetchProfileCard.mockReturnValue(of(mockProfileData));
    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.loading).toBe(false);
  });

  it('should handle error state', async () => {
    const errorMessage = 'Failed to load profile card';
    profileCardService.fetchProfileCard.mockReturnValue(throwError(() => ({ status: 500, message: errorMessage })));

    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.error).toBe('Failed to load profile. Please try again.');
    expect(component.loading).toBe(false);
    expect(component.profileData).toBeNull();
    expect(metaService.setDefaultTags).toHaveBeenCalled();
    expect(analyticsService.trackError).toHaveBeenCalledWith('load_error', 'Failed to load profile', 'test-user-1');
  });

  it('should handle 404 error', async () => {
    profileCardService.fetchProfileCard.mockReturnValue(throwError(() => ({ status: 404 })));

    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.error).toBe('Profile not found');
    expect(component.loading).toBe(false);
    expect(analyticsService.trackError).toHaveBeenCalledWith('not_found', 'Profile not found', 'test-user-1');
  });

  it('should handle profile card without rankings', async () => {
    const dataWithoutRankings = {
      ...mockProfileData,
      rankings: {},
    };
    profileCardService.fetchProfileCard.mockReturnValue(of(dataWithoutRankings));

    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.profileData?.rankings.postRank).toBeUndefined();
    expect(component.profileData?.rankings.aiUsageRank).toBeUndefined();
  });

  it('should retry loading profile card', () => {
    profileCardService.fetchProfileCard.mockReturnValue(of(mockProfileData));
    component.userId = 'test-user-1';

    component.retry();

    expect(profileCardService.fetchProfileCard).toHaveBeenCalledWith('test-user-1');
  });

  it('should navigate to leaderboard', () => {
    component.goToLeaderboard();

    expect(router.navigate).toHaveBeenCalledWith(['/leaderboard']);
  });

  it('should format date correctly', () => {
    const formatted = component.formatDate('2024-01-01T12:00:00Z');
    expect(formatted).toContain('2024');
    expect(formatted).toContain('January');
  });

  it('should format relative time correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000).toISOString();
    const formatted = component.formatRelativeTime(oneHourAgo);
    expect(formatted).toContain('hour');
  });
});

/**
 * Unit tests for LeaderboardComponent
 */

import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LeaderboardComponent } from './leaderboard.component';
import { LeaderboardService } from '../../services/leaderboard.service';
import { MetaService } from '../../services/meta.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { LeaderboardData } from '../../models/leaderboard.model';

describe('LeaderboardComponent', () => {
  let component: LeaderboardComponent;
  let leaderboardService: {
    fetchLeaderboard: ReturnType<typeof vi.fn>;
    fetchLeaderboardByTag: ReturnType<typeof vi.fn>;
  };
  let metaService: { setLeaderboardTags: ReturnType<typeof vi.fn> };
  let analyticsService: { trackLeaderboardView: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let activatedRoute: { paramMap: any };

  const mockUniquePostsLeaderboard: LeaderboardData = {
    type: 'unique-posts',
    generatedAt: '2024-11-10T00:00:00Z',
    entries: [
      {
        rank: 1,
        userId: 'user1',
        displayName: 'Top User',
        value: 100,
        profileCardUrl: 'https://cards.example.com/user1',
      },
      {
        rank: 2,
        userId: 'user2',
        displayName: 'Second User',
        value: 75,
        profileCardUrl: 'https://cards.example.com/user2',
      },
      {
        rank: 3,
        userId: 'user3',
        displayName: 'Third User',
        value: 50,
        profileCardUrl: 'https://cards.example.com/user3',
      },
    ],
  };

  const mockTotalPostsLeaderboard: LeaderboardData = {
    type: 'total-posts',
    generatedAt: '2024-11-10T00:00:00Z',
    entries: [
      {
        rank: 1,
        userId: 'user1',
        displayName: 'Top User',
        value: 300,
        profileCardUrl: 'https://cards.example.com/user1',
      },
      {
        rank: 2,
        userId: 'user2',
        displayName: 'Second User',
        value: 225,
        profileCardUrl: 'https://cards.example.com/user2',
      },
    ],
  };

  const mockAIUsageLeaderboard: LeaderboardData = {
    type: 'ai-usage',
    generatedAt: '2024-11-10T00:00:00Z',
    entries: [
      {
        rank: 1,
        userId: 'user4',
        displayName: 'AI Power User',
        value: 200,
        profileCardUrl: 'https://cards.example.com/user4',
      },
      {
        rank: 2,
        userId: 'user5',
        displayName: 'AI User',
        value: 150,
        profileCardUrl: 'https://cards.example.com/user5',
      },
    ],
  };

  const mockTagLeaderboard: LeaderboardData = {
    type: 'posts-by-tag',
    generatedAt: '2024-11-10T00:00:00Z',
    tagName: 'technology',
    entries: [
      {
        rank: 1,
        userId: 'user6',
        displayName: 'Tech User',
        value: 50,
        profileCardUrl: 'https://cards.example.com/user6',
      },
    ],
  };

  beforeEach(() => {
    leaderboardService = {
      fetchLeaderboard: vi.fn(),
      fetchLeaderboardByTag: vi.fn(),
      fetchTagsIndex: vi.fn(),
    };

    metaService = {
      setLeaderboardTags: vi.fn(),
    };

    analyticsService = {
      trackLeaderboardView: vi.fn(),
    };

    router = {
      navigate: vi.fn(),
    };

    activatedRoute = {
      paramMap: of(new Map()),
    };

    component = new LeaderboardComponent(
      leaderboardService as unknown as LeaderboardService,
      router as unknown as Router,
      activatedRoute as unknown as ActivatedRoute,
      metaService as unknown as MetaService,
      analyticsService as unknown as AnalyticsService,
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load all leaderboards on init', async () => {
    leaderboardService.fetchLeaderboard.mockImplementation((type: string) => {
      if (type === 'unique-posts') return of(mockUniquePostsLeaderboard);
      if (type === 'total-posts') return of(mockTotalPostsLeaderboard);
      if (type === 'ai-usage') return of(mockAIUsageLeaderboard);
      return of(null);
    });

    leaderboardService.fetchTagsIndex.mockReturnValue(
      of({
        tags: [{ name: 'technology', postCount: 50, userCount: 10 }],
        totalTags: 1,
        generatedAt: '2024-11-10T00:00:00Z',
      }),
    );

    component.ngOnInit();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(leaderboardService.fetchLeaderboard).toHaveBeenCalledWith('unique-posts');
    expect(leaderboardService.fetchLeaderboard).toHaveBeenCalledWith('total-posts');
    expect(leaderboardService.fetchLeaderboard).toHaveBeenCalledWith('ai-usage');
    expect(component.uniquePostsLeaderboard).toEqual(mockUniquePostsLeaderboard);
    expect(component.totalPostsLeaderboard).toEqual(mockTotalPostsLeaderboard);
    expect(component.aiUsageLeaderboard).toEqual(mockAIUsageLeaderboard);
    expect(component.loading).toBe(false);
    expect(metaService.setLeaderboardTags).toHaveBeenCalled();
    expect(analyticsService.trackLeaderboardView).toHaveBeenCalledWith('unique-posts');
  });

  it('should switch to AI usage leaderboard', () => {
    component.uniquePostsLeaderboard = mockUniquePostsLeaderboard;
    component.aiUsageLeaderboard = mockAIUsageLeaderboard;
    component.activeTab = 'unique-posts';

    component.switchTab('ai-usage');

    expect(component.activeTab).toBe('ai-usage');
    expect(component.searchQuery).toBe('');
    expect(analyticsService.trackLeaderboardView).toHaveBeenCalledWith('ai-usage');
  });

  it('should switch to posts-by-tag tab', () => {
    component.activeTab = 'unique-posts';

    component.switchTab('posts-by-tag');

    expect(component.activeTab).toBe('posts-by-tag');
    expect(component.searchQuery).toBe('');
    expect(analyticsService.trackLeaderboardView).toHaveBeenCalledWith('posts-by-tag');
  });

  it('should return current leaderboard based on active tab', () => {
    component.uniquePostsLeaderboard = mockUniquePostsLeaderboard;
    component.totalPostsLeaderboard = mockTotalPostsLeaderboard;
    component.aiUsageLeaderboard = mockAIUsageLeaderboard;

    component.activeTab = 'unique-posts';
    expect(component.currentLeaderboard).toEqual(mockUniquePostsLeaderboard);

    component.activeTab = 'total-posts';
    expect(component.currentLeaderboard).toEqual(mockTotalPostsLeaderboard);

    component.activeTab = 'ai-usage';
    expect(component.currentLeaderboard).toEqual(mockAIUsageLeaderboard);
  });

  it('should return tag leaderboard when posts-by-tag tab is active', () => {
    component.activeTab = 'posts-by-tag';
    component.selectedTag = 'technology';
    component.postsByTagLeaderboards.set('technology', mockTagLeaderboard);

    expect(component.currentLeaderboard).toEqual(mockTagLeaderboard);
  });

  it('should return null for posts-by-tag when no tag is selected', () => {
    component.activeTab = 'posts-by-tag';
    component.selectedTag = null;

    expect(component.currentLeaderboard).toBeNull();
  });

  it('should handle loading state', async () => {
    leaderboardService.fetchLeaderboard.mockReturnValue(of(mockUniquePostsLeaderboard));
    leaderboardService.fetchTagsIndex.mockReturnValue(
      of({
        tags: [],
        totalTags: 0,
        generatedAt: '2024-11-10T00:00:00Z',
      }),
    );

    expect(component.loading).toBe(true);

    component.loadLeaderboards();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.loading).toBe(false);
  });

  it('should handle error state', async () => {
    leaderboardService.fetchLeaderboard.mockReturnValue(throwError(() => new Error('Failed to load')));
    leaderboardService.fetchTagsIndex.mockReturnValue(throwError(() => new Error('Failed to load')));

    component.loadLeaderboards();

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.error).toBe('Failed to load most active users. Please try again.');
    expect(component.loading).toBe(false);
    expect(component.uniquePostsLeaderboard).toBeNull();
  });

  it('should load tag leaderboard', async () => {
    leaderboardService.fetchLeaderboardByTag.mockReturnValue(of(mockTagLeaderboard));

    component.loadTagLeaderboard('technology');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(leaderboardService.fetchLeaderboardByTag).toHaveBeenCalledWith('technology');
    expect(component.postsByTagLeaderboards.get('technology')).toEqual(mockTagLeaderboard);
    expect(component.selectedTag).toBe('technology');
  });

  it('should not reload tag leaderboard if already loaded', () => {
    component.postsByTagLeaderboards.set('technology', mockTagLeaderboard);
    component.selectedTag = null;

    component.loadTagLeaderboard('technology');

    expect(leaderboardService.fetchLeaderboardByTag).not.toHaveBeenCalled();
    expect(component.selectedTag).toBe('technology');
  });

  it('should handle tag leaderboard error', async () => {
    leaderboardService.fetchLeaderboardByTag.mockReturnValue(throwError(() => new Error('Tag not found')));

    component.loadTagLeaderboard('nonexistent');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(component.error).toBe('Failed to load leaderboard for tag "nonexistent".');
  });

  it('should filter leaderboard entries', () => {
    component.uniquePostsLeaderboard = mockUniquePostsLeaderboard;
    component.activeTab = 'unique-posts';

    component.searchQuery = 'Top';

    expect(component.filteredEntries.length).toBe(1);
    expect(component.filteredEntries[0].displayName).toBe('Top User');
  });

  it('should filter case-insensitively', () => {
    component.uniquePostsLeaderboard = mockUniquePostsLeaderboard;
    component.activeTab = 'unique-posts';

    component.searchQuery = 'top';

    expect(component.filteredEntries.length).toBe(1);
    expect(component.filteredEntries[0].displayName).toBe('Top User');
  });

  it('should show all entries when search is empty', () => {
    component.uniquePostsLeaderboard = mockUniquePostsLeaderboard;
    component.activeTab = 'unique-posts';

    component.searchQuery = '';

    expect(component.filteredEntries.length).toBe(3);
  });

  it('should handle empty leaderboard', () => {
    const emptyLeaderboard: LeaderboardData = {
      type: 'unique-posts',
      generatedAt: '2024-11-10T00:00:00Z',
      entries: [],
    };
    component.uniquePostsLeaderboard = emptyLeaderboard;
    component.activeTab = 'unique-posts';

    expect(component.currentLeaderboard?.entries.length).toBe(0);
    expect(component.filteredEntries.length).toBe(0);
  });

  it('should navigate to profile', () => {
    component.navigateToProfile('user123');

    expect(router.navigate).toHaveBeenCalledWith(['/', 'user123']);
  });

  it('should retry loading leaderboards', () => {
    leaderboardService.fetchLeaderboard.mockReturnValue(of(mockUniquePostsLeaderboard));
    leaderboardService.fetchTagsIndex.mockReturnValue(
      of({
        tags: [],
        totalTags: 0,
        generatedAt: '2024-11-10T00:00:00Z',
      }),
    );

    component.retry();

    expect(leaderboardService.fetchLeaderboard).toHaveBeenCalled();
  });

  it('should return correct rank class', () => {
    expect(component.getRankClass(1)).toBe('rank-gold');
    expect(component.getRankClass(2)).toBe('rank-silver');
    expect(component.getRankClass(3)).toBe('rank-bronze');
    expect(component.getRankClass(4)).toBe('');
  });

  it('should return correct rank emoji', () => {
    expect(component.getRankEmoji(1)).toBe('🥇');
    expect(component.getRankEmoji(2)).toBe('🥈');
    expect(component.getRankEmoji(3)).toBe('🥉');
    expect(component.getRankEmoji(4)).toBe('');
  });

  it('should format value with locale string', () => {
    expect(component.formatValue(1000)).toBe('1,000');
    expect(component.formatValue(1000000)).toBe('1,000,000');
  });

  it('should format date correctly', () => {
    const formatted = component.formatDate('2024-11-10T00:00:00Z');
    expect(formatted).toContain('2024');
    expect(formatted).toContain('Nov');
  });
});

import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LeaderboardService } from '../../services/leaderboard.service';
import { MetaService } from '../../services/meta.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { LeaderboardData, LeaderboardEntry, PostLeaderboardData } from '../../models/leaderboard.model';

@Component({
  selector: 'app-leaderboard',
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LeaderboardComponent implements OnInit {
  activeTab:
    | 'unique-posts'
    | 'total-posts'
    | 'ai-usage'
    | 'current-streak'
    | 'longest-streak'
    | 'posts-by-tag'
    | 'links-shared'
    | 'likes'
    | 'impressions' = 'unique-posts';

  // NEW: View mode for performance metrics (users vs posts)
  viewMode: 'users' | 'posts' = 'users';

  uniquePostsLeaderboard: LeaderboardData | null = null;
  totalPostsLeaderboard: LeaderboardData | null = null;
  aiUsageLeaderboard: LeaderboardData | null = null;
  currentStreakLeaderboard: LeaderboardData | null = null;
  longestStreakLeaderboard: LeaderboardData | null = null;
  postsByTagLeaderboards: Map<string, LeaderboardData> = new Map();

  // NEW: Performance leaderboards
  linksSharedLeaderboard: LeaderboardData | null = null;
  likesLeaderboard: LeaderboardData | null = null;
  impressionsLeaderboard: LeaderboardData | null = null;

  // NEW: Post leaderboards
  topPostsLinksLeaderboard: PostLeaderboardData | null = null;
  topPostsLikesLeaderboard: PostLeaderboardData | null = null;
  topPostsImpressionsLeaderboard: PostLeaderboardData | null = null;

  // NEW: Network-specific leaderboards
  networkSpecificLeaderboards: Map<string, LeaderboardData> = new Map();
  selectedNetwork: string | null = 'all'; // 'all', 'X', 'LINKEDIN', 'BLUESKY'

  selectedTag: string | null = null;
  availableTags: Array<{ name: string; postCount: number; userCount: number }> = [];
  filteredTags: Array<{ name: string; postCount: number; userCount: number }> = [];
  loading = true;
  error: string | null = null;
  searchQuery = '';
  tagSearchQuery = '';

  constructor(
    private leaderboardService: LeaderboardService,
    private router: Router,
    private route: ActivatedRoute,
    private metaService: MetaService,
    private analyticsService: AnalyticsService,
  ) {}

  ngOnInit(): void {
    this.metaService.setLeaderboardTags();

    // Read tab and tag from URL parameters
    this.route.paramMap.subscribe((params) => {
      const tab = params.get('tab');
      const tagName = params.get('tagName');

      if (tagName) {
        // Direct tag URL like /leaderboard/tags/machinelearning
        this.activeTab = 'posts-by-tag';
        this.selectedTag = tagName;
      } else if (tab) {
        this.activeTab = this.mapUrlToTab(tab);
      }

      // Track most active users view
      this.analyticsService.trackLeaderboardView(this.activeTab);
    });

    this.loadLeaderboards();
  }

  private mapUrlToTab(
    urlSegment: string,
  ):
    | 'unique-posts'
    | 'total-posts'
    | 'ai-usage'
    | 'current-streak'
    | 'longest-streak'
    | 'posts-by-tag'
    | 'links-shared'
    | 'likes'
    | 'impressions' {
    const mapping: Record<
      string,
      | 'unique-posts'
      | 'total-posts'
      | 'ai-usage'
      | 'current-streak'
      | 'longest-streak'
      | 'posts-by-tag'
      | 'links-shared'
      | 'likes'
      | 'impressions'
    > = {
      posts: 'unique-posts',
      'unique-posts': 'unique-posts',
      total: 'total-posts',
      'total-posts': 'total-posts',
      streak: 'current-streak',
      'current-streak': 'current-streak',
      'streak-record': 'longest-streak',
      'longest-streak': 'longest-streak',
      ai: 'ai-usage',
      'ai-usage': 'ai-usage',
      tags: 'posts-by-tag',
      'posts-by-tag': 'posts-by-tag',
      // NEW: Performance tabs
      'links-shared': 'links-shared',
      links: 'links-shared',
      likes: 'likes',
      impressions: 'impressions',
    };

    return mapping[urlSegment] || 'unique-posts';
  }

  private mapTabToUrl(
    tab:
      | 'unique-posts'
      | 'total-posts'
      | 'ai-usage'
      | 'current-streak'
      | 'longest-streak'
      | 'posts-by-tag'
      | 'links-shared'
      | 'likes'
      | 'impressions',
  ): string {
    const mapping: Record<string, string> = {
      'unique-posts': 'posts',
      'total-posts': 'total',
      'current-streak': 'streak',
      'longest-streak': 'streak-record',
      'ai-usage': 'ai',
      'posts-by-tag': 'tags',
      // NEW: Performance tabs
      'links-shared': 'links-shared',
      likes: 'likes',
      impressions: 'impressions',
    };

    return mapping[tab] || 'posts';
  }

  loadLeaderboards(): void {
    this.loading = true;
    this.error = null;

    // Load all leaderboards in parallel
    Promise.all([
      this.leaderboardService.fetchLeaderboard('unique-posts').toPromise(),
      this.leaderboardService.fetchLeaderboard('total-posts').toPromise(),
      this.leaderboardService.fetchLeaderboard('ai-usage').toPromise(),
      this.leaderboardService.fetchLeaderboard('current-streak').toPromise(),
      this.leaderboardService.fetchLeaderboard('longest-streak').toPromise(),
      // NEW: Load performance leaderboards
      this.leaderboardService.fetchLeaderboard('links-shared').toPromise(),
      this.leaderboardService.fetchLeaderboard('likes').toPromise(),
      this.leaderboardService.fetchLeaderboard('impressions').toPromise(),
      this.leaderboardService.fetchTagsIndex().toPromise(),
    ])
      .then(
        ([
          uniquePosts,
          totalPosts,
          aiUsage,
          currentStreak,
          longestStreak,
          linksShared,
          likes,
          impressions,
          tagsIndex,
        ]) => {
          this.uniquePostsLeaderboard = uniquePosts || null;
          this.totalPostsLeaderboard = totalPosts || null;
          this.aiUsageLeaderboard = aiUsage || null;
          this.currentStreakLeaderboard = currentStreak || null;
          this.longestStreakLeaderboard = longestStreak || null;

          // NEW: Set performance leaderboards
          this.linksSharedLeaderboard = linksShared || null;
          this.likesLeaderboard = likes || null;
          this.impressionsLeaderboard = impressions || null;

          // Load available tags from index
          if (tagsIndex) {
            this.availableTags = tagsIndex.tags;
            this.filteredTags = [...this.availableTags];
          }

          // If we have a selected tag from URL, load its leaderboard
          if (this.selectedTag && !this.postsByTagLeaderboards.has(this.selectedTag)) {
            this.loadTagLeaderboardData(this.selectedTag);
          }

          this.loading = false;
        },
      )
      .catch((err) => {
        console.error('Error loading most active users:', err);
        this.error = 'Failed to load most active users. Please try again.';
        this.loading = false;
      });
  }

  filterTags(): void {
    if (!this.tagSearchQuery.trim()) {
      this.filteredTags = [...this.availableTags];
      return;
    }

    const query = this.tagSearchQuery.toLowerCase();
    this.filteredTags = this.availableTags.filter((tag) => tag.name.toLowerCase().includes(query));
  }

  onTagSearchChange(): void {
    this.filterTags();
  }

  goBackToTags(): void {
    this.selectedTag = null;
    this.router.navigate(['/leaderboard/tags']);
  }

  loadTagLeaderboard(tagName: string): void {
    // Update URL to reflect selected tag
    this.router.navigate(['/leaderboard/tags', tagName]);
    this.loadTagLeaderboardData(tagName);
  }

  private loadTagLeaderboardData(tagName: string): void {
    if (this.postsByTagLeaderboards.has(tagName)) {
      this.selectedTag = tagName;
      return;
    }

    this.leaderboardService
      .fetchLeaderboardByTag(tagName)
      .toPromise()
      .then((data) => {
        if (data) {
          this.postsByTagLeaderboards.set(tagName, data);
          this.selectedTag = tagName;
        }
      })
      .catch((err) => {
        console.error(`Error loading tag leaderboard for ${tagName}:`, err);
        this.error = `Failed to load leaderboard for tag "${tagName}".`;
      });
  }

  switchTab(
    tab:
      | 'unique-posts'
      | 'total-posts'
      | 'ai-usage'
      | 'current-streak'
      | 'longest-streak'
      | 'posts-by-tag'
      | 'links-shared'
      | 'likes'
      | 'impressions',
  ): void {
    this.activeTab = tab;
    this.searchQuery = '';

    // Reset view mode when switching away from performance tabs
    if (!this.isPerformanceTab(tab)) {
      this.viewMode = 'users';
      this.selectedNetwork = 'all';
    }

    // Reset tag selection when switching to tags tab
    if (tab === 'posts-by-tag') {
      this.selectedTag = null;
      this.tagSearchQuery = '';
      this.filterTags();
    }

    // Update URL to reflect the selected tab
    const urlSegment = this.mapTabToUrl(tab);
    this.router.navigate(['/leaderboard', urlSegment]);

    // Track tab switch
    this.analyticsService.trackLeaderboardView(tab);
  }

  // NEW: Check if tab is a performance tab
  isPerformanceTab(tab: string): boolean {
    return ['links-shared', 'likes', 'impressions'].includes(tab);
  }

  // NEW: Switch between users and posts view mode
  switchViewMode(mode: 'users' | 'posts'): void {
    this.viewMode = mode;

    // Load post leaderboards if not already loaded and switching to posts view
    if (mode === 'posts' && !this.topPostsLinksLeaderboard) {
      this.loadPostLeaderboards();
    }
  }

  // NEW: Switch network filter
  switchNetwork(network: string): void {
    this.selectedNetwork = network;

    // Load network-specific leaderboards if needed
    if (network !== 'all' && !this.hasNetworkLeaderboards(network)) {
      this.loadNetworkLeaderboards(network);
    }
  }

  // NEW: Load post leaderboards
  loadPostLeaderboards(): void {
    Promise.all([
      this.leaderboardService.fetchPostLeaderboard('top-posts-links').toPromise(),
      this.leaderboardService.fetchPostLeaderboard('top-posts-likes').toPromise(),
      this.leaderboardService.fetchPostLeaderboard('top-posts-impressions').toPromise(),
    ])
      .then(([topPostsLinks, topPostsLikes, topPostsImpressions]) => {
        this.topPostsLinksLeaderboard = topPostsLinks || null;
        this.topPostsLikesLeaderboard = topPostsLikes || null;
        this.topPostsImpressionsLeaderboard = topPostsImpressions || null;
      })
      .catch((err) => {
        console.error('Error loading post leaderboards:', err);
      });
  }

  // NEW: Load network-specific leaderboards
  loadNetworkLeaderboards(network: string): void {
    const networkKey = network.toLowerCase();
    Promise.all([
      this.leaderboardService
        .fetchLeaderboard(
          `links-shared-${networkKey}` as 'links-shared-x' | 'links-shared-linkedin' | 'links-shared-bluesky',
        )
        .toPromise(),
      this.leaderboardService
        .fetchLeaderboard(`likes-${networkKey}` as 'likes-x' | 'likes-linkedin' | 'likes-bluesky')
        .toPromise(),
      this.leaderboardService
        .fetchLeaderboard(
          `impressions-${networkKey}` as 'impressions-x' | 'impressions-linkedin' | 'impressions-bluesky',
        )
        .toPromise(),
    ])
      .then(([linksShared, likes, impressions]) => {
        if (linksShared) this.networkSpecificLeaderboards.set(`links-shared-${networkKey}`, linksShared);
        if (likes) this.networkSpecificLeaderboards.set(`likes-${networkKey}`, likes);
        if (impressions) this.networkSpecificLeaderboards.set(`impressions-${networkKey}`, impressions);
      })
      .catch((err) => {
        console.error(`Error loading network leaderboards for ${network}:`, err);
      });
  }

  // NEW: Check if network leaderboards are loaded
  hasNetworkLeaderboards(network: string): boolean {
    const networkKey = network.toLowerCase();
    return (
      this.networkSpecificLeaderboards.has(`links-shared-${networkKey}`) &&
      this.networkSpecificLeaderboards.has(`likes-${networkKey}`) &&
      this.networkSpecificLeaderboards.has(`impressions-${networkKey}`)
    );
  }

  get currentLeaderboard(): LeaderboardData | null {
    // Handle network-specific view
    if (this.selectedNetwork && this.selectedNetwork !== 'all' && this.isPerformanceTab(this.activeTab)) {
      const networkKey = this.selectedNetwork.toLowerCase();
      const key = `${this.activeTab}-${networkKey}`;
      return this.networkSpecificLeaderboards.get(key) || null;
    }

    switch (this.activeTab) {
      case 'unique-posts':
        return this.uniquePostsLeaderboard;
      case 'total-posts':
        return this.totalPostsLeaderboard;
      case 'ai-usage':
        return this.aiUsageLeaderboard;
      case 'current-streak':
        return this.currentStreakLeaderboard;
      case 'longest-streak':
        return this.longestStreakLeaderboard;
      case 'posts-by-tag':
        return this.selectedTag ? this.postsByTagLeaderboards.get(this.selectedTag) || null : null;
      // NEW: Performance leaderboards
      case 'links-shared':
        return this.linksSharedLeaderboard;
      case 'likes':
        return this.likesLeaderboard;
      case 'impressions':
        return this.impressionsLeaderboard;
      default:
        return null;
    }
  }

  // NEW: Get current post leaderboard
  get currentPostLeaderboard(): PostLeaderboardData | null {
    if (this.viewMode !== 'posts' || !this.isPerformanceTab(this.activeTab)) {
      return null;
    }

    switch (this.activeTab) {
      case 'links-shared':
        return this.topPostsLinksLeaderboard;
      case 'likes':
        return this.topPostsLikesLeaderboard;
      case 'impressions':
        return this.topPostsImpressionsLeaderboard;
      default:
        return null;
    }
  }

  get filteredEntries(): LeaderboardEntry[] {
    if (!this.currentLeaderboard) return [];

    const entries = this.currentLeaderboard.entries;
    if (!this.searchQuery.trim()) return entries;

    const query = this.searchQuery.toLowerCase();
    return entries.filter((entry) => entry.displayName.toLowerCase().includes(query));
  }

  navigateToProfile(userId: string): void {
    this.router.navigate(['/', userId]);
  }

  retry(): void {
    this.loadLeaderboards();
  }

  getRankClass(rank: number): string {
    if (rank === 1) return 'rank-gold';
    if (rank === 2) return 'rank-silver';
    if (rank === 3) return 'rank-bronze';
    return '';
  }

  getRankEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  }

  formatValue(value: number): string {
    if (this.activeTab === 'current-streak' || this.activeTab === 'longest-streak') {
      return `${value.toLocaleString()} ${value === 1 ? 'day' : 'days'}`;
    }
    return value.toLocaleString();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

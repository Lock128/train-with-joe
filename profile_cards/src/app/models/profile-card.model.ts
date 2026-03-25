export interface ProfileCardData {
  userId: string;
  displayName: string;
  joinDate: string;

  metrics: {
    uniquePosts: number; // Number of unique posts (regardless of platforms)
    totalPostsAcrossNetworks: number; // Total posts across all networks (same post on 3 networks = 3)
    connectedPlatforms: number;
    currentStreak: number;
    longestStreak: number;
    totalAIUsage: number;

    aiPostGeneration: number;
    aiTextEnhancement: number;
    aiScheduling: number;
    aiTagSuggestion: number;

    // Posts by tag
    postsByTag?: Record<string, number>;

    // Performance metrics
    totalLinksShared: number;
    totalLikes: number;
    totalImpressions: number;
    performanceByNetwork?: Record<
      string,
      {
        linksShared: number;
        likes: number;
        impressions: number;
      }
    >;
  };

  recentPosts: RecentPost[];

  // Post activity data for contribution graph
  postDates?: string[]; // Array of ISO date strings when posts were published

  rankings: {
    uniquePostsRank?: number;
    totalPostsRank?: number;
    aiUsageRank?: number;
    linksSharedRank?: number;
    likesRank?: number;
    impressionsRank?: number;
  };

  lastUpdated: string;
  profileCardVersion: string;
}

export interface RecentPost {
  postId: string;
  title: string;
  content: string;
  publishedAt: string;
  platforms: PlatformLink[];
}

export interface PlatformLink {
  network:
    | 'X'
    | 'LINKEDIN'
    | 'BLUESKY'
    | 'THREADS'
    | 'MASTODON'
    | 'SLACK'
    | 'YOUTUBE'
    | 'TIKTOK'
    | 'FACEBOOK'
    | 'INSTAGRAM';
  url: string;
  handle: string;
}

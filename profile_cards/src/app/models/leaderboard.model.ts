export interface LeaderboardData {
  type:
    | 'unique-posts'
    | 'total-posts'
    | 'ai-usage'
    | 'posts-by-tag'
    | 'current-streak'
    | 'longest-streak'
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
    | 'impressions-tiktok';
  generatedAt: string;
  entries: LeaderboardEntry[];
  tagName?: string; // For posts-by-tag type
  network?: string; // For network-specific types
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  value: number;
  profileCardUrl: string;
}

// NEW: Post leaderboard data structure
export interface PostLeaderboardData {
  type: 'top-posts-links' | 'top-posts-likes' | 'top-posts-impressions';
  generatedAt: string;
  entries: PostLeaderboardEntry[];
}

// NEW: Individual entry in a post leaderboard
export interface PostLeaderboardEntry {
  rank: number;
  postId: string;
  userId: string;
  displayName: string;
  title: string;
  content: string; // Truncated
  publishedAt: string;
  networks: string[];
  value: number; // The metric value (clicks, likes, or impressions)
  bestPerformingNetwork: string;
  bestPerformingUrl?: string;
  profileCardUrl: string;
}

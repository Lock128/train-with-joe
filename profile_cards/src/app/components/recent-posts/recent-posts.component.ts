import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { RecentPost } from '../../models/profile-card.model';

@Component({
  selector: 'app-recent-posts',
  templateUrl: './recent-posts.component.html',
  styleUrls: ['./recent-posts.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class RecentPostsComponent {
  @Input() posts: RecentPost[] = [];

  truncateContent(content: string, maxLength: number = 280): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getPlatformIcon(network: string): string {
    const icons: { [key: string]: string } = {
      X: '𝕏',
      LINKEDIN: '🔗',
      BLUESKY: '☁️',
      THREADS: '💬',
      MASTODON: '🐾',
      SLACK: '#️⃣',
      FACEBOOK: '👤',
      YOUTUBE: '▶️',
    };
    return icons[network] || '🔗';
  }

  getPlatformName(network: string): string {
    const names: { [key: string]: string } = {
      X: 'X (Twitter)',
      LINKEDIN: 'LinkedIn',
      BLUESKY: 'Bluesky',
      THREADS: 'Threads',
      MASTODON: 'Mastodon',
      SLACK: 'Slack',
      YOUTUBE: 'YouTube',
    };
    return names[network] || network;
  }
}

import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { ProfileCardData } from '../models/profile-card.model';

@Injectable({
  providedIn: 'root',
})
export class MetaService {
  private readonly defaultTitle = 'Train with Joe Profile Cards';
  private readonly defaultDescription = 'View user statistics and achievements on Train with Joe';
  private readonly defaultImage = '/assets/images/og-default.png';

  constructor(
    private meta: Meta,
    private title: Title,
  ) {}

  setDefaultTags(): void {
    this.title.setTitle(this.defaultTitle);
    this.updateMetaTags({
      title: this.defaultTitle,
      description: this.defaultDescription,
      image: this.defaultImage,
      url: window.location.href,
    });
  }

  setProfileCardTags(profileData: ProfileCardData, userId: string): void {
    const title = `${profileData.displayName}'s Train with Joe Profile`;
    const description = `${profileData.metrics.uniquePosts} unique posts (${profileData.metrics.totalPostsAcrossNetworks} total across networks) published on ${profileData.metrics.connectedPlatforms} platforms. ${profileData.metrics.currentStreak} day current streak.`;
    const image = `/assets/images/og-profile-${userId}.png`; // Dynamic OG image (future enhancement)
    const url = `${window.location.origin}/${userId}`;

    this.title.setTitle(title);
    this.updateMetaTags({
      title,
      description,
      image,
      url,
      type: 'profile',
    });
  }

  setLeaderboardTags(): void {
    const title = 'Most Active Users - Train with Joe';
    const description = 'Top contributors on Train with Joe by unique posts, total posts across networks, and AI usage';
    const image = this.defaultImage;
    const url = `${window.location.origin}/leaderboard`;

    this.title.setTitle(title);
    this.updateMetaTags({
      title,
      description,
      image,
      url,
    });
  }

  private updateMetaTags(tags: {
    title: string;
    description: string;
    image: string;
    url: string;
    type?: string;
  }): void {
    // Open Graph tags
    this.meta.updateTag({ property: 'og:type', content: tags.type || 'website' });
    this.meta.updateTag({ property: 'og:title', content: tags.title });
    this.meta.updateTag({ property: 'og:description', content: tags.description });
    this.meta.updateTag({ property: 'og:image', content: tags.image });
    this.meta.updateTag({ property: 'og:url', content: tags.url });

    // Twitter Card tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: tags.title });
    this.meta.updateTag({ name: 'twitter:description', content: tags.description });
    this.meta.updateTag({ name: 'twitter:image', content: tags.image });

    // Standard meta tags
    this.meta.updateTag({ name: 'description', content: tags.description });
  }
}

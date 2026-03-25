import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface OGMetaConfig {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  username?: string;
  stats?: {
    posts: number;
    streak: number;
    aiUsage: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class OGMetaService {
  private readonly baseUrl = 'https://train-with-joe.com/cards';
  private readonly defaultImage = `${this.baseUrl}/assets/images/og-profile.png`;

  constructor(
    private meta: Meta,
    private title: Title,
  ) {}

  /**
   * Update OG meta tags for profile cards
   */
  updateProfileCardMeta(config: OGMetaConfig): void {
    // Update title
    this.title.setTitle(config.title);

    // Update or add meta tags
    this.updateMetaTag('description', config.description);

    // Open Graph tags
    this.updateMetaTag('og:title', config.title, 'property');
    this.updateMetaTag('og:description', config.description, 'property');
    this.updateMetaTag('og:type', config.type || 'profile', 'property');
    this.updateMetaTag('og:url', config.url || this.baseUrl, 'property');
    this.updateMetaTag('og:image', config.image || this.defaultImage, 'property');
    this.updateMetaTag('og:image:width', '1200', 'property');
    this.updateMetaTag('og:image:height', '630', 'property');
    this.updateMetaTag('og:site_name', 'Train with Joe', 'property');

    // Twitter Card tags
    this.updateMetaTag('twitter:card', 'summary_large_image');
    this.updateMetaTag('twitter:title', config.title);
    this.updateMetaTag('twitter:description', config.description);
    this.updateMetaTag('twitter:image', config.image || this.defaultImage);
    this.updateMetaTag('twitter:site', '@train_with_joe');

    // Profile-specific tags
    if (config.username) {
      this.updateMetaTag('profile:username', config.username, 'property');
    }

    // Add structured data for profile
    this.addStructuredData(config);
  }

  /**
   * Generate dynamic OG image URL based on user data
   */
  generateProfileImageUrl(username: string, stats?: OGMetaConfig['stats']): string {
    const params = new URLSearchParams({
      type: 'profile',
      username: username,
      ...(stats && {
        posts: stats.posts.toString(),
        streak: stats.streak.toString(),
        aiUsage: stats.aiUsage.toString(),
      }),
    });

    return `${this.baseUrl}/api/og-image?${params.toString()}`;
  }

  /**
   * Update leaderboard meta tags
   */
  updateLeaderboardMeta(leaderboardType: string, period: string): void {
    const title = `${leaderboardType} Leaderboard - ${period} | Train with Joe`;
    const description = `View the top performers in ${leaderboardType.toLowerCase()} for ${period.toLowerCase()}. See who's leading in social media automation.`;

    this.updateProfileCardMeta({
      title,
      description,
      type: 'website',
      image: this.generateLeaderboardImageUrl(leaderboardType, period),
    });
  }

  private generateLeaderboardImageUrl(type: string, period: string): string {
    const params = new URLSearchParams({
      type: 'leaderboard',
      leaderboardType: type,
      period: period,
    });

    return `${this.baseUrl}/api/og-image?${params.toString()}`;
  }

  private updateMetaTag(name: string, content: string, attribute: string = 'name'): void {
    const selector = `${attribute}="${name}"`;

    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [attribute]: name, content });
    } else {
      this.meta.addTag({ [attribute]: name, content });
    }
  }

  private addStructuredData(config: OGMetaConfig): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      name: config.title,
      description: config.description,
      url: config.url || this.baseUrl,
      image: config.image || this.defaultImage,
      mainEntity: {
        '@type': 'Person',
        name: config.username,
        url: config.url,
      },
    };

    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  }

  /**
   * Reset to default meta tags
   */
  resetToDefaults(): void {
    this.updateProfileCardMeta({
      title: 'Train with Joe Profile Cards - Social Media Statistics',
      description:
        'View detailed social media statistics and achievements. Track posts, engagement streaks, and AI usage across multiple platforms.',
      type: 'website',
    });
  }
}

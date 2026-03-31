import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import type { CompetitorData } from '../models/competitor.interface';

export interface ComparisonMetaConfig {
  title?: string;
  description?: string;
  image?: string;
  keywords?: string[];
  competitor?: CompetitorData;
}

@Injectable({
  providedIn: 'root',
})
export class OGMetaService {
  private readonly baseUrl: string;
  private readonly defaultImage: string;

  constructor(
    private meta: Meta,
    private title: Title,
  ) {
    // Use current location to determine the base URL
    this.baseUrl = `${window.location.protocol}//${window.location.host}/compare`;
    this.defaultImage = `${this.baseUrl}/assets/images/og-compare.png`;
  }

  /**
   * Update meta tags for comparison overview page
   */
  updateComparisonOverviewMeta(): void {
    const title = 'Train with Joe vs Competitors - Complete Social Media Management Comparison';
    const description =
      'Compare Train with Joe with Buffer, Hootsuite, Later, and other social media management tools. See features, pricing, and why Train with Joe offers the best AI-powered automation.';
    const keywords = [
      'social media management comparison',
      'Buffer alternative',
      'Hootsuite alternative',
      'Later alternative',
      'social media automation',
      'AI content generation',
      'multi-platform posting',
      'social media scheduling',
    ];

    this.updatePageMeta({
      title,
      description,
      keywords,
      image: this.defaultImage,
    });

    // Add structured data for comparison page
    this.addComparisonStructuredData(title, description, this.defaultImage);
  }

  /**
   * Update meta tags for individual competitor comparison page
   */
  updateCompetitorComparisonMeta(competitor: CompetitorData): void {
    const title = `Train with Joe vs ${competitor.name} - Detailed Feature & Pricing Comparison`;
    const description = `Compare Train with Joe with ${competitor.name}. See detailed feature comparison, pricing analysis, and why users are switching to Train with Joe's AI-powered social media automation.`;
    const keywords = [
      `${competitor.name} alternative`,
      `Train with Joe vs ${competitor.name}`,
      'social media management comparison',
      'AI content generation',
      'social media automation',
      'multi-platform posting',
      competitor.name.toLowerCase(),
      'social media scheduling',
    ];

    const competitorImage = this.generateCompetitorImageUrl(competitor.slug);

    this.updatePageMeta({
      title,
      description,
      keywords,
      image: competitorImage,
      competitor,
    });

    // Add structured data for competitor comparison
    this.addCompetitorStructuredData(competitor, title, description, competitorImage);
  }

  /**
   * Generate dynamic OG image URL for competitor comparisons
   */
  generateCompetitorImageUrl(competitorSlug: string): string {
    const params = new URLSearchParams({
      type: 'competitor',
      competitor: competitorSlug,
    });

    return `${this.baseUrl}/api/og-image?${params.toString()}`;
  }

  private updatePageMeta(config: ComparisonMetaConfig): void {
    const { title, description, keywords, image } = config;

    // Update title
    if (title) {
      this.title.setTitle(title);
    }

    // Update or add meta tags
    if (description) {
      this.updateMetaTag('description', description);
    }

    if (keywords && keywords.length > 0) {
      this.updateMetaTag('keywords', keywords.join(', '));
    }

    // Open Graph tags
    if (title) {
      this.updateMetaTag('og:title', title, 'property');
    }
    if (description) {
      this.updateMetaTag('og:description', description, 'property');
    }
    this.updateMetaTag('og:type', 'website', 'property');
    this.updateMetaTag('og:url', window.location.href, 'property');
    if (image) {
      this.updateMetaTag('og:image', image, 'property');
      this.updateMetaTag('og:image:width', '1200', 'property');
      this.updateMetaTag('og:image:height', '630', 'property');
    }
    this.updateMetaTag('og:site_name', 'Train with Joe', 'property');

    // Twitter Card tags
    this.updateMetaTag('twitter:card', 'summary_large_image');
    if (title) {
      this.updateMetaTag('twitter:title', title);
    }
    if (description) {
      this.updateMetaTag('twitter:description', description);
    }
    if (image) {
      this.updateMetaTag('twitter:image', image);
    }
    this.updateMetaTag('twitter:site', '@train_with_joe');

    // Additional SEO meta tags
    this.updateMetaTag('robots', 'index, follow');
    this.updateMetaTag('author', 'Train with Joe');
    this.updateMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  private updateMetaTag(name: string, content: string, attribute: string = 'name'): void {
    const selector = `${attribute}="${name}"`;

    if (this.meta.getTag(selector)) {
      this.meta.updateTag({ [attribute]: name, content });
    } else {
      this.meta.addTag({ [attribute]: name, content });
    }
  }

  private addComparisonStructuredData(title: string, description: string, image: string): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: description,
      url: window.location.href,
      image: image,
      mainEntity: {
        '@type': 'SoftwareApplication',
        name: 'Train with Joe',
        applicationCategory: 'BusinessApplication',
        description: 'AI-powered social media management and automation platform',
        url: 'https://trainwithjoe.com',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free tier available with premium features',
        },
        featureList: [
          'Multi-platform social media posting',
          'AI-powered content enhancement via Amazon Bedrock',
          'Advanced mention resolution',
          'Smart post scheduling',
          'OAuth2 secure authentication',
          'Real-time analytics',
        ],
        operatingSystem: 'Web Browser',
        applicationSubCategory: 'Social Media Management',
      },
    };

    this.insertStructuredData(structuredData);
  }

  private addCompetitorStructuredData(
    competitor: CompetitorData,
    title: string,
    description: string,
    image: string,
  ): void {
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description: description,
      url: window.location.href,
      image: image,
      mainEntity: {
        '@type': 'ComparisonTable',
        name: `${competitor.name} vs Train with Joe Comparison`,
        description: `Detailed comparison between ${competitor.name} and Train with Joe social media management platforms`,
        about: [
          {
            '@type': 'SoftwareApplication',
            name: competitor.name,
            url: competitor.website,
            description: competitor.tagline,
            applicationCategory: 'BusinessApplication',
          },
          {
            '@type': 'SoftwareApplication',
            name: 'Train with Joe',
            url: 'https://trainwithjoe.com',
            description: 'AI-powered social media management and automation platform',
            applicationCategory: 'BusinessApplication',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
              description: 'Free tier available',
            },
          },
        ],
      },
    };

    this.insertStructuredData(structuredData);
  }

  private insertStructuredData(data: Record<string, unknown>): void {
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new structured data
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }
}

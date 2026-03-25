import { Injectable } from '@angular/core';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private isGoogleAnalyticsLoaded = false;

  constructor() {
    this.initializeGoogleAnalytics();
  }

  private initializeGoogleAnalytics(): void {
    // Check if Google Analytics is already loaded
    if (typeof window !== 'undefined' && window.gtag) {
      this.isGoogleAnalyticsLoaded = true;
      return;
    }

    // Initialize Google Analytics if not already loaded
    if (typeof window !== 'undefined') {
      // Create dataLayer if it doesn't exist
      window.dataLayer = window.dataLayer || [];

      // Define gtag function
      window.gtag = function () {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };

      // Initialize with current timestamp
      window.gtag('js', new Date());

      // Configure Google Analytics (using a placeholder ID for now)
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: 'Competitor Comparison',
        page_location: window.location.href,
      });

      this.isGoogleAnalyticsLoaded = true;
    }
  }

  /**
   * Track page views for competitor comparison pages
   */
  trackPageView(pageName: string, pageTitle?: string): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('config', 'GA_MEASUREMENT_ID', {
      page_title: pageTitle || pageName,
      page_location: window.location.href,
      custom_map: {
        custom_parameter_1: 'competitor_comparison',
      },
    });

    // Also send a page_view event
    window.gtag?.('event', 'page_view', {
      page_title: pageTitle || pageName,
      page_location: window.location.href,
      content_group1: 'competitor_comparison',
    });
  }

  /**
   * Track user engagement events
   */
  trackEngagement(action: string, details?: Record<string, unknown>): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'engagement', {
      event_category: 'competitor_comparison',
      event_label: action,
      custom_parameter_1: 'engagement',
      ...details,
    });
  }

  /**
   * Track search and filter usage
   */
  trackSearch(searchTerm: string, resultsCount: number): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'search', {
      search_term: searchTerm,
      event_category: 'competitor_comparison',
      event_label: 'search_competitors',
      value: resultsCount,
      custom_parameter_1: 'search_functionality',
    });
  }

  /**
   * Track filter usage
   */
  trackFilter(filterType: string, filterValue: string, resultsCount: number): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'filter_applied', {
      event_category: 'competitor_comparison',
      event_label: `${filterType}_${filterValue}`,
      filter_type: filterType,
      filter_value: filterValue,
      results_count: resultsCount,
      custom_parameter_1: 'filter_functionality',
    });
  }

  /**
   * Track conversion events (sign-ups, trial starts, etc.)
   */
  trackConversion(conversionType: string, competitorContext?: string): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'conversion', {
      event_category: 'competitor_comparison',
      event_label: conversionType,
      conversion_type: conversionType,
      competitor_context: competitorContext,
      custom_parameter_1: 'conversion_tracking',
      value: 1,
    });

    // Also track as a specific conversion event
    window.gtag?.('event', conversionType, {
      event_category: 'conversions',
      source: 'competitor_comparison',
      competitor_context: competitorContext,
    });
  }

  /**
   * Track competitor-specific interactions
   */
  trackCompetitorInteraction(competitorName: string, action: string, details?: Record<string, unknown>): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'competitor_interaction', {
      event_category: 'competitor_comparison',
      event_label: `${competitorName}_${action}`,
      competitor_name: competitorName,
      interaction_type: action,
      custom_parameter_1: 'competitor_analysis',
      ...details,
    });
  }

  /**
   * Track feature comparison interactions
   */
  trackFeatureComparison(featureName: string, action: string): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'feature_comparison', {
      event_category: 'competitor_comparison',
      event_label: `${featureName}_${action}`,
      feature_name: featureName,
      interaction_type: action,
      custom_parameter_1: 'feature_analysis',
    });
  }

  /**
   * Track pricing comparison interactions
   */
  trackPricingComparison(competitorName: string, action: string, pricingTier?: string): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'pricing_comparison', {
      event_category: 'competitor_comparison',
      event_label: `${competitorName}_${action}`,
      competitor_name: competitorName,
      interaction_type: action,
      pricing_tier: pricingTier,
      custom_parameter_1: 'pricing_analysis',
    });
  }

  /**
   * Track time spent on comparison pages
   */
  trackTimeSpent(pageName: string, timeSpentSeconds: number): void {
    if (!this.isGoogleAnalyticsLoaded || typeof window === 'undefined') {
      return;
    }

    window.gtag?.('event', 'timing_complete', {
      name: 'page_engagement',
      value: Math.round(timeSpentSeconds * 1000), // Convert to milliseconds
      event_category: 'competitor_comparison',
      event_label: pageName,
      custom_parameter_1: 'engagement_timing',
    });
  }

  /**
   * Check if analytics is properly loaded and configured
   */
  isAnalyticsReady(): boolean {
    return this.isGoogleAnalyticsLoaded && typeof window !== 'undefined' && !!window.gtag;
  }
}

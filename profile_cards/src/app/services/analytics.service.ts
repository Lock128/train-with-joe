import { Injectable } from '@angular/core';

/**
 * Analytics service for tracking profile card views and interactions
 * Logs events to CloudWatch Logs via console.log (captured by CloudWatch RUM if configured)
 */
@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  private readonly namespace = 'ProfileCards';

  constructor() {}

  /**
   * Track profile card page view
   */
  trackProfileCardView(userId: string, referrer?: string): void {
    const event = {
      event: 'profile_card_view',
      namespace: this.namespace,
      userId,
      timestamp: new Date().toISOString(),
      referrer: referrer || document.referrer || 'direct',
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logEvent(event);
  }

  /**
   * Track leaderboard page view
   */
  trackLeaderboardView(
    leaderboardType:
      | 'unique-posts'
      | 'total-posts'
      | 'ai-usage'
      | 'posts-by-tag'
      | 'current-streak'
      | 'longest-streak'
      | 'links-shared'
      | 'likes'
      | 'impressions',
  ): void {
    const event = {
      event: 'leaderboard_view',
      namespace: this.namespace,
      leaderboardType,
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'direct',
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logEvent(event);
  }

  /**
   * Track profile card error
   */
  trackError(errorType: string, errorMessage: string, userId?: string): void {
    const event = {
      event: 'profile_card_error',
      namespace: this.namespace,
      errorType,
      errorMessage,
      userId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    this.logEvent(event);
  }

  /**
   * Track profile card load time
   */
  trackLoadTime(userId: string, loadTimeMs: number): void {
    const event = {
      event: 'profile_card_load_time',
      namespace: this.namespace,
      userId,
      loadTimeMs,
      timestamp: new Date().toISOString(),
    };

    this.logEvent(event);
  }

  /**
   * Log event to console (captured by CloudWatch RUM or other monitoring)
   */
  private logEvent(event: Record<string, unknown>): void {
    // Log as structured JSON for easy parsing
    console.log('[Analytics]', JSON.stringify(event));

    // If CloudWatch RUM is configured, it will capture these logs
    // Alternative: Send to a custom analytics endpoint
    this.sendToAnalyticsEndpoint(event);
  }

  /**
   * Send analytics event to backend endpoint (optional)
   * This can be implemented to send events to CloudWatch Logs via API Gateway + Lambda
   */
  private sendToAnalyticsEndpoint(_event: Record<string, unknown>): void {
    // Optional: Implement backend analytics endpoint
    // For now, we rely on CloudWatch RUM or client-side logging
    // Example implementation:
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event),
    // }).catch(err => console.error('Failed to send analytics:', err));
  }
}

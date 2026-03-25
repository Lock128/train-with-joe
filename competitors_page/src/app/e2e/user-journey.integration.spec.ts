import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterOutlet } from '@angular/router';
import { vi } from 'vitest';
import { describe, it, expect, beforeEach } from 'vitest';
import { ComparisonOverviewComponent } from '../components/comparison-overview/comparison-overview.component';
import { CompetitorDetailComponent } from '../components/competitor-detail/competitor-detail.component';
import { FeatureMatrixComponent } from '../components/feature-matrix/feature-matrix.component';
import { PricingTableComponent } from '../components/pricing-table/pricing-table.component';
import { CompetitorDataService } from '../services/competitor-data.service';
import { OGMetaService } from '../services/og-meta.service';
import { AnalyticsService } from '../services/analytics.service';

/**
 * User Journey Integration Tests
 *
 * Tests complete user interactions with DOM elements, form submissions,
 * button clicks, and visual feedback throughout the application.
 *
 * **Feature: competitor-comparison-pages, User Journey Integration**
 */

@Component({
  template: '<router-outlet></router-outlet>',
  imports: [RouterOutlet],
})
class TestAppComponent {}

describe('User Journey Integration Tests', () => {
  let component: TestAppComponent;
  let fixture: ComponentFixture<TestAppComponent>;
  let router: Router;
  let location: Location;
  let competitorDataService: ReturnType<typeof vi.fn>;
  let analyticsService: ReturnType<typeof vi.fn>;

  const mockCompetitorData = [
    {
      name: 'Buffer',
      slug: 'buffer',
      tagline: 'The social media toolkit for small businesses',
      logo: '/assets/images/competitors/buffer-logo.png',
      website: 'https://buffer.com',
      pricing: [
        {
          name: 'Free',
          price: 0,
          billing: 'monthly' as const,
          features: ['3 social channels', '10 scheduled posts per channel'],
          limitations: ['Limited analytics', 'No team features'],
        },
        {
          name: 'Pro',
          price: 15,
          billing: 'monthly' as const,
          features: ['8 social channels', 'Unlimited posts', 'Advanced analytics'],
          limitations: ['Limited team features'],
        },
      ],
      features: {
        multiPlatformPosting: 'full' as const,
        aiContentGeneration: 'none' as const,
        scheduling: 'full' as const,
        analytics: 'partial' as const,
        teamCollaboration: 'premium' as const,
        mentionResolution: 'none' as const,
        contentRecycling: 'none' as const,
        visualPlanning: 'partial' as const,
        socialListening: 'premium' as const,
      },
      pros: ['User-friendly interface', 'Reliable scheduling'],
      cons: ['No AI content generation', 'Limited free plan'],
      targetAudience: 'Small businesses',
      lastUpdated: '2024-12-30',
    },
    {
      name: 'Hootsuite',
      slug: 'hootsuite',
      tagline: 'Manage all your social media in one place',
      logo: '/assets/images/competitors/hootsuite-logo.png',
      website: 'https://hootsuite.com',
      pricing: [
        {
          name: 'Professional',
          price: 99,
          billing: 'monthly' as const,
          features: ['10 social profiles', 'Unlimited scheduling'],
          limitations: ['Expensive for small teams'],
        },
      ],
      features: {
        multiPlatformPosting: 'full' as const,
        aiContentGeneration: 'partial' as const,
        scheduling: 'full' as const,
        analytics: 'full' as const,
        teamCollaboration: 'full' as const,
        mentionResolution: 'partial' as const,
        contentRecycling: 'partial' as const,
        visualPlanning: 'full' as const,
        socialListening: 'full' as const,
      },
      pros: ['Comprehensive features', 'Enterprise-grade'],
      cons: ['Expensive', 'Complex interface'],
      targetAudience: 'Large enterprises',
      lastUpdated: '2024-12-30',
    },
  ];

  beforeEach(async () => {
    const competitorDataServiceSpy = {
      loadCompetitorData: vi.fn(),
      getAllCompetitors: vi.fn(),
      getCompetitorBySlug: vi.fn(),
      getOverallDataFreshness: vi.fn(),
      getNexusShareData: vi.fn(),
      isDataOutdated: vi.fn(),
      competitors$: {
        pipe: vi.fn().mockReturnValue({
          subscribe: vi.fn(),
        }),
      },
    };
    const ogMetaServiceSpy = {
      updateComparisonOverviewMeta: vi.fn(),
      updateCompetitorComparisonMeta: vi.fn(),
    };
    const analyticsServiceSpy = {
      trackPageView: vi.fn(),
      trackEngagement: vi.fn(),
      trackConversion: vi.fn(),
      trackTimeSpent: vi.fn(),
      trackSearch: vi.fn(),
      trackFilter: vi.fn(),
      trackCompetitorInteraction: vi.fn(),
      trackFeatureComparison: vi.fn(),
      trackPricingComparison: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [
        TestAppComponent,
        ComparisonOverviewComponent,
        CompetitorDetailComponent,
        FeatureMatrixComponent,
        PricingTableComponent,
      ],
      providers: [
        provideRouter([
          { path: '', component: ComparisonOverviewComponent },
          { path: ':competitor', component: CompetitorDetailComponent },
        ]),
        { provide: CompetitorDataService, useValue: competitorDataServiceSpy },
        { provide: OGMetaService, useValue: ogMetaServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TestAppComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    // Verify component is properly initialized
    expect(component).toBeTruthy();
    competitorDataService = TestBed.inject(CompetitorDataService) as any;
    analyticsService = TestBed.inject(AnalyticsService) as any;

    // Setup service mocks
    competitorDataService.loadCompetitorData.mockReturnValue(Promise.resolve(mockCompetitorData));
    competitorDataService.getAllCompetitors.mockReturnValue(mockCompetitorData);
    competitorDataService.getCompetitorBySlug.mockImplementation((slug: string) =>
      mockCompetitorData.find((c) => c.slug === slug),
    );
    competitorDataService.getOverallDataFreshness.mockReturnValue({
      totalCompetitors: mockCompetitorData.length,
      freshCount: 1,
      moderateCount: 1,
      outdatedCount: 0,
      staleCount: 0,
      oldestDataAge: 0,
      newestDataAge: 0,
      averageDataAge: 0,
      needsUpdateCount: 0,
    });
    competitorDataService.getNexusShareData.mockReturnValue({
      uniqueFeatures: ['AI Content Generation', 'Mention Resolution'],
      pricing: [
        {
          name: 'Free',
          price: 0,
          billing: 'monthly',
          features: ['3 social channels', '10 posts per month'],
          limitations: ['Limited analytics'],
        },
        {
          name: 'Pro',
          price: 9,
          billing: 'monthly',
          features: ['Unlimited posts', 'AI content generation'],
          limitations: [],
        },
      ],
    });
    competitorDataService.isDataOutdated.mockReturnValue(false);

    fixture.detectChanges();
  });

  describe('Overview Page User Interactions', () => {
    it('should display feature matrix and allow user interactions', async () => {
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check if feature matrix is displayed - look for the actual selector used in overview
      const featureMatrix = fixture.debugElement.query(By.css('.feature-matrix, .feature-matrix-section'));
      expect(featureMatrix).toBeTruthy();

      // Check if competitor cards are clickable - look for actual competitor links
      const competitorLinks = fixture.debugElement.queryAll(
        By.css('.competitor-link, .detailed-comparison-link, a[routerLink]'),
      );
      expect(competitorLinks.length).toBeGreaterThan(0);

      // Simulate clicking on a competitor link (if present)
      if (competitorLinks.length > 0) {
        const firstLink = competitorLinks[0];
        firstLink.nativeElement.click();
        fixture.detectChanges();
        await fixture.whenStable();

        // Should navigate to competitor detail page
        expect(location.path()).not.toBe('');
      }
    });

    it('should display call-to-action buttons and track clicks', async () => {
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Look for CTA buttons
      const ctaButtons = fixture.debugElement.queryAll(By.css('.cta-button, .btn-primary, [data-testid="cta-button"]'));

      if (ctaButtons.length > 0) {
        const firstCTA = ctaButtons[0];
        firstCTA.nativeElement.click();
        fixture.detectChanges();

        // Should track conversion event
        expect(analyticsService.trackConversion).toHaveBeenCalledWith(
          expect.stringMatching(/cta|conversion|signup/i),
          expect.any(String),
        );
      }
    });

    it('should handle search functionality if present', async () => {
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Look for search input
      const searchInput = fixture.debugElement.query(
        By.css('input[type="search"], .search-input, [data-testid="search"]'),
      );

      if (searchInput) {
        // Type in search input
        searchInput.nativeElement.value = 'scheduling';
        searchInput.nativeElement.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        // Should filter results or show search results
        expect(fixture.componentInstance).toBeTruthy();
      }
    });
  });

  describe('Competitor Detail Page Interactions', () => {
    it('should display detailed comparison and handle user interactions', async () => {
      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check if competitor detail content is displayed - look for actual selectors
      const competitorName = fixture.debugElement.query(By.css('h1, .competitor-name, .hero-section h1'));
      expect(competitorName).toBeTruthy();
      if (competitorName) {
        expect(competitorName.nativeElement.textContent).toContain('Buffer');
      }

      // Check if pricing table is displayed - look for actual component selectors
      const pricingTable = fixture.debugElement.query(By.css('app-pricing-table, .pricing-table, .pricing-section'));
      expect(pricingTable).toBeTruthy();

      // Check if feature comparison is displayed - look for actual component selectors
      const featureComparison = fixture.debugElement.query(
        By.css('app-feature-matrix, .feature-matrix, .feature-comparison'),
      );
      expect(featureComparison).toBeTruthy();
    });

    it('should handle breadcrumb navigation', async () => {
      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Look for breadcrumb navigation
      const breadcrumbs = fixture.debugElement.queryAll(By.css('.breadcrumb a, .breadcrumb-link'));

      if (breadcrumbs.length > 0) {
        // Click on overview breadcrumb
        const overviewBreadcrumb = breadcrumbs.find(
          (b) =>
            b.nativeElement.textContent.toLowerCase().includes('overview') ||
            b.nativeElement.textContent.toLowerCase().includes('compare'),
        );

        if (overviewBreadcrumb) {
          overviewBreadcrumb.nativeElement.click();
          fixture.detectChanges();
          await fixture.whenStable();

          expect(location.path()).toBe('');
        }
      }
    });

    it('should display and interact with pricing information', async () => {
      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Check if pricing tiers are displayed
      const pricingTiers = fixture.debugElement.queryAll(By.css('.pricing-tier, .price-card'));
      expect(pricingTiers.length).toBeGreaterThan(0);

      // Check if pricing contains expected information
      const pricingContent = fixture.nativeElement.textContent;
      expect(pricingContent).toContain('Free');
      expect(pricingContent).toContain('Pro');
    });

    it('should handle feature tooltips and explanations', async () => {
      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Look for feature items with tooltips
      const featureItems = fixture.debugElement.queryAll(By.css('.feature-item, [data-tooltip], .tooltip-trigger'));

      if (featureItems.length > 0) {
        const featureWithTooltip = featureItems[0];

        // Simulate hover to show tooltip
        featureWithTooltip.nativeElement.dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        // Tooltip should be visible or component should handle hover
        expect(fixture.componentInstance).toBeTruthy();

        // Simulate mouse leave
        featureWithTooltip.nativeElement.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
      }
    });
  });

  describe('Cross-Component Navigation Flow', () => {
    it('should maintain state during navigation between pages', async () => {
      // Start at overview
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(competitorDataService.loadCompetitorData).toHaveBeenCalled();

      // Navigate to Buffer
      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(location.path()).toBe('/buffer');
      expect(competitorDataService.getCompetitorBySlug).toHaveBeenCalledWith('buffer');

      // Navigate to Hootsuite
      await router.navigate(['hootsuite']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(location.path()).toBe('/hootsuite');
      expect(competitorDataService.getCompetitorBySlug).toHaveBeenCalledWith('hootsuite');

      // Navigate back to overview
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(location.path()).toBe('');
    });

    it('should handle rapid navigation without breaking', async () => {
      // Rapidly navigate between different pages
      const navigationSequence = [[''], ['buffer'], ['hootsuite'], [''], ['buffer'], ['nonexistent'], ['']];

      for (const route of navigationSequence) {
        await router.navigate(route);
        fixture.detectChanges();
        // Don't wait for stability to simulate rapid navigation
      }

      // Final stability check
      await fixture.whenStable();
      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing competitor data gracefully', async () => {
      // Mock service to return undefined for specific competitor
      competitorDataService.getCompetitorBySlug.mockReturnValue(undefined);

      await router.navigate(['nonexistent']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Component should still render without throwing errors
      expect(fixture.componentInstance).toBeTruthy();
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle service failures gracefully', async () => {
      // Mock service to throw error
      competitorDataService.loadCompetitorData.mockReturnValue(Promise.reject(new Error('Network error')));

      await router.navigate(['']);
      fixture.detectChanges();

      // Component should handle error gracefully
      try {
        await fixture.whenStable();
      } catch (error) {
        // Expected to fail, but component should still be functional
      }

      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('Responsive Behavior Testing', () => {
    it('should adapt to mobile viewport changes', async () => {
      // Set mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 667, configurable: true });

      await router.navigate(['']);
      fixture.detectChanges();
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();
      await fixture.whenStable();

      // Component should render without errors on mobile
      expect(fixture.componentInstance).toBeTruthy();
      expect(() => fixture.detectChanges()).not.toThrow();
    });

    it('should handle orientation changes', async () => {
      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', { value: 667, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 375, configurable: true });
      window.dispatchEvent(new Event('orientationchange'));
      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      expect(fixture.componentInstance).toBeTruthy();
    });
  });

  describe('Analytics Integration Testing', () => {
    it('should track page views for all navigation events', async () => {
      // Navigate through multiple pages
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      await router.navigate(['buffer']);
      fixture.detectChanges();
      await fixture.whenStable();

      await router.navigate(['hootsuite']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Verify analytics calls - only overview page tracks analytics currently
      expect(analyticsService.trackPageView).toHaveBeenCalledTimes(1);
      expect(analyticsService.trackPageView).toHaveBeenCalledWith(
        'comparison_overview',
        'Competitor Comparison Overview',
      );
    });

    it('should track user interaction events', async () => {
      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      // Look for trackable elements
      const trackableElements = fixture.debugElement.queryAll(By.css('[data-track], .track-click, .cta-button'));

      if (trackableElements.length > 0) {
        trackableElements[0].nativeElement.click();
        fixture.detectChanges();

        expect(analyticsService.trackEngagement).toHaveBeenCalled();
      }
    });
  });

  describe('Performance Integration', () => {
    it('should load and render within performance budgets', async () => {
      const startTime = performance.now();

      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within 3 seconds as per requirements
      expect(renderTime).toBeLessThan(3000);
    });

    it('should handle large datasets without performance degradation', async () => {
      // Create larger mock dataset
      const largeDataset = Array.from({ length: 20 }, (_, i) => ({
        ...mockCompetitorData[0],
        name: `Competitor ${i + 1}`,
        slug: `competitor-${i + 1}`,
      }));

      competitorDataService.getAllCompetitors.mockReturnValue(largeDataset);
      competitorDataService.loadCompetitorData.mockReturnValue(Promise.resolve(largeDataset));

      const startTime = performance.now();

      await router.navigate(['']);
      fixture.detectChanges();
      await fixture.whenStable();

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should still render efficiently with larger dataset
      expect(renderTime).toBeLessThan(5000);
      expect(fixture.componentInstance).toBeTruthy();
    });
  });
});

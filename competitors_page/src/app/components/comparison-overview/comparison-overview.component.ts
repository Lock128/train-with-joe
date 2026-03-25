import { OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { CompetitorDataService } from '../../services/competitor-data.service';
import { OGMetaService } from '../../services/og-meta.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { CompetitorData, YourProductData, FeatureStatus } from '../../models/competitor.interface';
import { DataFreshnessComponent } from '../data-freshness/data-freshness.component';

@Component({
  selector: 'app-comparison-overview',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataFreshnessComponent],
  templateUrl: './comparison-overview.component.html',
  styleUrl: './comparison-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonOverviewComponent implements OnInit, OnDestroy {
  competitors: CompetitorData[] = [];
  filteredCompetitors: CompetitorData[] = [];
  yourProductData: YourProductData | null = null;
  loading = false;
  error: string | null = null;
  routingError: string | null = null;

  // Search and filter properties
  searchTerm = '';
  selectedPriceRange = 'all';
  selectedFeatureCategory = 'all';
  showFilters = false;

  // Performance optimizations
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  private pageStartTime = Date.now();

  // Price range options
  priceRanges = [
    { value: 'all', label: 'All Prices' },
    { value: 'free', label: 'Free Plans Available' },
    { value: 'under-10', label: 'Under $10/month' },
    { value: '10-25', label: '$10-25/month' },
    { value: 'over-25', label: 'Over $25/month' },
  ];

  // Feature category options
  featureCategories = [
    { value: 'all', label: 'All Features' },
    { value: 'content', label: 'Content Creation' },
    { value: 'scheduling', label: 'Scheduling & Publishing' },
    { value: 'analytics', label: 'Analytics & Reporting' },
    { value: 'collaboration', label: 'Team Collaboration' },
    { value: 'ai', label: 'AI Features' },
  ];

  // Feature list for the comparison matrix
  featureList = [
    { key: 'multiPlatformPosting' as keyof CompetitorData['features'], displayName: 'Multi-Platform Posting' },
    { key: 'aiContentGeneration' as keyof CompetitorData['features'], displayName: 'AI Content Generation' },
    { key: 'scheduling' as keyof CompetitorData['features'], displayName: 'Post Scheduling' },
    { key: 'analytics' as keyof CompetitorData['features'], displayName: 'Analytics & Insights' },
    { key: 'teamCollaboration' as keyof CompetitorData['features'], displayName: 'Team Collaboration' },
    { key: 'mentionResolution' as keyof CompetitorData['features'], displayName: 'Mention Resolution' },
    { key: 'contentRecycling' as keyof CompetitorData['features'], displayName: 'Content Recycling' },
    { key: 'visualPlanning' as keyof CompetitorData['features'], displayName: 'Visual Planning' },
    { key: 'socialListening' as keyof CompetitorData['features'], displayName: 'Social Listening' },
  ];

  // Your Product features (mapped to match competitor features for comparison)
  yourProductFeatures = {
    multiPlatformPosting: 'full' as FeatureStatus,
    aiContentGeneration: 'full' as FeatureStatus,
    scheduling: 'full' as FeatureStatus,
    analytics: 'full' as FeatureStatus,
    teamCollaboration: 'premium' as FeatureStatus,
    mentionResolution: 'full' as FeatureStatus,
    contentRecycling: 'full' as FeatureStatus,
    visualPlanning: 'full' as FeatureStatus,
    socialListening: 'none' as FeatureStatus,
  };

  constructor(
    private competitorDataService: CompetitorDataService,
    private ogMetaService: OGMetaService,
    private analyticsService: AnalyticsService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {
    // Set up debounced search
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.performSearch(searchTerm);
      });
  }

  async ngOnInit() {
    // Update SEO meta tags for overview page
    this.ogMetaService.updateComparisonOverviewMeta();

    // Track page view
    this.analyticsService.trackPageView('comparison_overview', 'Competitor Comparison Overview');

    // Check for routing errors from query parameters
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['error']) {
        switch (params['error']) {
          case 'competitor-not-found':
            this.routingError = `Competitor "${params['slug']}" not found. Please select from the available comparisons below.`;
            break;
          case 'data-load-failed':
            this.routingError = 'Failed to load competitor data. Please try again.';
            break;
          default:
            this.routingError = 'An error occurred while loading the comparison page.';
        }

        // Track error occurrence
        this.analyticsService.trackEngagement('routing_error', {
          error_type: params['error'],
          competitor_slug: params['slug'],
        });

        // Clear error after 5 seconds
        setTimeout(() => {
          this.routingError = null;
          this.cdr.markForCheck();
        }, 5000);
      }
    });

    await this.loadData();
  }

  ngOnDestroy() {
    // Complete the destroy subject to unsubscribe from observables
    this.destroy$.next();
    this.destroy$.complete();

    // Track time spent on page
    const timeSpent = (Date.now() - this.pageStartTime) / 1000;
    this.analyticsService.trackTimeSpent('comparison_overview', timeSpent);
  }

  async loadData() {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      this.competitors = await this.competitorDataService.loadCompetitorData();
      this.filteredCompetitors = [...this.competitors];
      this.yourProductData = this.competitorDataService.getYourProductData();
      this.applyFilters();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to load comparison data';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async retryLoad() {
    await this.loadData();
  }

  async forceRefresh() {
    // Clear cache and reload data
    this.competitorDataService.clearData();
    await this.loadData();
  }

  getFeatureIcon(status: FeatureStatus): string {
    switch (status) {
      case 'full':
        return '✓';
      case 'partial':
        return '◐';
      case 'premium':
        return '★';
      case 'none':
        return '✗';
      default:
        return '?';
    }
  }

  getFeatureText(status: FeatureStatus): string {
    switch (status) {
      case 'full':
        return 'Full Support';
      case 'partial':
        return 'Limited';
      case 'premium':
        return 'Premium Only';
      case 'none':
        return 'Not Available';
      default:
        return 'Unknown';
    }
  }

  getFeatureClass(status: FeatureStatus): string {
    return `feature-${status}`;
  }

  getTopPricingTiers(competitor: CompetitorData) {
    // Return first 2 pricing tiers to keep the display manageable
    return competitor.pricing.slice(0, 2);
  }

  getTopFeatures(features: string[]) {
    // Return first 3 features to keep the display clean
    return features.slice(0, 3);
  }

  getTopLimitations(limitations: string[]) {
    // Return first 2 limitations to keep the display clean
    return limitations.slice(0, 2);
  }

  calculateSavings(competitor: CompetitorData): number {
    // Calculate savings compared to competitor's lowest paid tier
    const competitorPaidTiers = competitor.pricing.filter((tier) => typeof tier.price === 'number' && tier.price > 0);
    if (competitorPaidTiers.length === 0) return 0;

    const lowestCompetitorPrice = Math.min(...competitorPaidTiers.map((tier) => tier.price as number));
    const yourProductProTier = this.yourProductData?.pricing.find(
      (tier: { name: string; price: number | 'Custom' }) => tier.name === 'Pro',
    );
    const yourProductProPrice =
      yourProductProTier && typeof yourProductProTier.price === 'number' ? yourProductProTier.price : 15;

    return Math.max(0, lowestCompetitorPrice - yourProductProPrice);
  }

  dismissRoutingError(): void {
    this.routingError = null;
    // Clear query parameters to clean up the URL
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true,
    });
  }

  // Search and filter functionality
  onSearchChange(): void {
    // Use the debounced search subject
    this.searchSubject.next(this.searchTerm);
  }

  private performSearch(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFilters();

    // Track search analytics
    if (searchTerm.trim()) {
      this.analyticsService.trackSearch(searchTerm, this.filteredCompetitors.length);
    }

    this.cdr.markForCheck();
  }

  onPriceRangeChange(): void {
    this.analyticsService.trackFilter('price_range', this.selectedPriceRange, this.filteredCompetitors.length);
    this.applyFilters();
  }

  onFeatureCategoryChange(): void {
    this.analyticsService.trackFilter(
      'feature_category',
      this.selectedFeatureCategory,
      this.filteredCompetitors.length,
    );
    this.applyFilters();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
    this.analyticsService.trackEngagement('toggle_filters', {
      filters_visible: this.showFilters,
    });
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedPriceRange = 'all';
    this.selectedFeatureCategory = 'all';
    this.analyticsService.trackEngagement('clear_filters');
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.competitors];

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (competitor) =>
          competitor.name.toLowerCase().includes(searchLower) ||
          competitor.tagline.toLowerCase().includes(searchLower) ||
          competitor.targetAudience.toLowerCase().includes(searchLower) ||
          competitor.pros.some((pro) => pro.toLowerCase().includes(searchLower)) ||
          this.featureList.some((feature) => {
            const featureStatus = competitor.features[feature.key];
            return (
              feature.displayName.toLowerCase().includes(searchLower) ||
              (featureStatus === 'full' && searchLower.includes('full')) ||
              (featureStatus === 'partial' && searchLower.includes('partial')) ||
              (featureStatus === 'premium' && searchLower.includes('premium'))
            );
          }),
      );
    }

    // Apply price range filter
    if (this.selectedPriceRange !== 'all') {
      filtered = filtered.filter((competitor) => this.matchesPriceRange(competitor));
    }

    // Apply feature category filter
    if (this.selectedFeatureCategory !== 'all') {
      filtered = filtered.filter((competitor) => this.matchesFeatureCategory(competitor));
    }

    this.filteredCompetitors = filtered;
  }

  private matchesPriceRange(competitor: CompetitorData): boolean {
    const numericPrices = competitor.pricing
      .filter((tier) => typeof tier.price === 'number')
      .map((tier) => tier.price as number);

    if (numericPrices.length === 0) return true; // Include competitors with only custom pricing

    const minPrice = Math.min(...numericPrices);
    const maxPrice = Math.max(...numericPrices.filter((p) => p > 0));

    switch (this.selectedPriceRange) {
      case 'free':
        return numericPrices.includes(0);
      case 'under-10':
        return maxPrice < 10;
      case '10-25':
        return minPrice <= 25 && maxPrice >= 10;
      case 'over-25':
        return minPrice > 25;
      default:
        return true;
    }
  }

  private matchesFeatureCategory(competitor: CompetitorData): boolean {
    const features = competitor.features;

    switch (this.selectedFeatureCategory) {
      case 'content':
        return (
          features.aiContentGeneration === 'full' ||
          features.contentRecycling === 'full' ||
          features.visualPlanning === 'full'
        );
      case 'scheduling':
        return features.scheduling === 'full' || features.multiPlatformPosting === 'full';
      case 'analytics':
        return features.analytics === 'full' || features.socialListening === 'full';
      case 'collaboration':
        return features.teamCollaboration === 'full' || features.teamCollaboration === 'premium';
      case 'ai':
        return features.aiContentGeneration === 'full' || features.aiContentGeneration === 'partial';
      default:
        return true;
    }
  }

  getFilteredCompetitorsCount(): number {
    return this.filteredCompetitors.length;
  }

  getTotalCompetitorsCount(): number {
    return this.competitors.length;
  }

  // Analytics tracking methods
  trackCompetitorClick(competitorName: string): void {
    this.analyticsService.trackCompetitorInteraction(competitorName, 'detailed_comparison_click');
  }

  trackFeatureTooltip(featureName: string): void {
    this.analyticsService.trackFeatureComparison(featureName, 'tooltip_view');
  }

  trackPricingView(competitorName: string): void {
    this.analyticsService.trackPricingComparison(competitorName, 'pricing_view');
  }

  trackConversionClick(conversionType: string, competitorContext?: string): void {
    this.analyticsService.trackConversion(conversionType, competitorContext);
  }

  trackSavingsCalculation(competitorName: string): void {
    this.analyticsService.trackPricingComparison(competitorName, 'savings_calculation');
  }

  // Keyboard navigation support
  onKeyDown(event: KeyboardEvent, action: () => void): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  }

  // Focus management
  focusElement(elementId: string): void {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.focus();
      }
    }, 100);
  }
}

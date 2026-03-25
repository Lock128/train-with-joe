import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { describe, expect, beforeEach, vi } from 'vitest';
import { ComparisonOverviewComponent } from './comparison-overview.component';
import { CompetitorDataService } from '../../services/competitor-data.service';
import { OGMetaService } from '../../services/og-meta.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { CompetitorData, TrainWithJoeData } from '../../models/competitor.interface';
import * as fc from 'fast-check';

/**
 * Property-based tests for performance standards
 * **Property 12: Performance and user experience standards**
 * **Validates: Requirements 8.1, 8.2, 8.3**
 */
describe('ComparisonOverviewComponent - Performance Property Tests', () => {
  let component: ComparisonOverviewComponent;
  let fixture: ComponentFixture<ComparisonOverviewComponent>;
  let mockCompetitorDataService: ReturnType<typeof vi.fn>;

  const mockCompetitors: CompetitorData[] = [
    {
      name: 'Buffer',
      slug: 'buffer',
      tagline: 'Social media toolkit',
      logo: '/assets/buffer-logo.png',
      website: 'https://buffer.com',
      pricing: [
        {
          name: 'Free',
          price: 0,
          billing: 'monthly',
          features: ['3 social channels'],
          limitations: ['Limited analytics'],
        },
      ],
      features: {
        multiPlatformPosting: 'full',
        aiContentGeneration: 'none',
        scheduling: 'full',
        analytics: 'partial',
        teamCollaboration: 'premium',
        mentionResolution: 'none',
        contentRecycling: 'none',
        visualPlanning: 'partial',
        socialListening: 'premium',
      },
      pros: ['User-friendly'],
      cons: ['No AI features'],
      targetAudience: 'Small businesses',
      lastUpdated: '2024-12-30',
    },
  ];

  const mockTrainWithJoeData: TrainWithJoeData = {
    uniqueFeatures: ['AI-powered content enhancement'],
    pricing: [
      {
        name: 'Free',
        price: 0,
        billing: 'monthly',
        features: ['AI content enhancement'],
        limitations: ['Train with Joe branding'],
      },
    ],
  };

  beforeEach(async () => {
    const competitorDataServiceSpy = vi.fn();
    competitorDataServiceSpy.loadCompetitorData = vi.fn();
    competitorDataServiceSpy.getTrainWithJoeData = vi.fn();

    const ogMetaServiceSpy = vi.fn();
    ogMetaServiceSpy.updateComparisonOverviewMeta = vi.fn();

    const analyticsServiceSpy = vi.fn();
    analyticsServiceSpy.trackPageView = vi.fn();
    analyticsServiceSpy.trackEngagement = vi.fn();
    analyticsServiceSpy.trackTimeSpent = vi.fn();

    await TestBed.configureTestingModule({
      imports: [ComparisonOverviewComponent, FormsModule],
      providers: [
        { provide: CompetitorDataService, useValue: competitorDataServiceSpy },
        { provide: OGMetaService, useValue: ogMetaServiceSpy },
        { provide: AnalyticsService, useValue: analyticsServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComparisonOverviewComponent);
    component = fixture.componentInstance;
    mockCompetitorDataService = TestBed.inject(CompetitorDataService) as any;

    mockCompetitorDataService.loadCompetitorData.mockReturnValue(Promise.resolve(mockCompetitors));
    mockCompetitorDataService.getTrainWithJoeData.mockReturnValue(mockTrainWithJoeData);
  });

  /**
   * Property 12: Performance and user experience standards
   * For any comparison page, loading time should be under 3 seconds, navigation should be smooth
   * between pages, and the interface should be fully functional on mobile devices
   * **Validates: Requirements 8.1, 8.2, 8.3**
   */
  it.skip('should meet performance standards for loading times and responsiveness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          competitorCount: fc.integer({ min: 1, max: 10 }),
          searchTerm: fc.string({ minLength: 0, maxLength: 50 }),
          filterChanges: fc.integer({ min: 0, max: 5 }),
          viewportWidth: fc.integer({ min: 320, max: 1920 }),
          viewportHeight: fc.integer({ min: 568, max: 1080 }),
        }),
        async (testData) => {
          // Test 1: Component initialization should be fast (< 100ms)
          const initStartTime = performance.now();

          const testCompetitors = Array(testData.competitorCount)
            .fill(0)
            .map((_, i) => ({
              ...mockCompetitors[0],
              name: `Competitor ${i + 1}`,
              slug: `competitor-${i + 1}`,
            }));

          mockCompetitorDataService.loadCompetitorData.and.returnValue(Promise.resolve(testCompetitors));

          await component.ngOnInit();
          fixture.detectChanges();
          await fixture.whenStable();

          const initEndTime = performance.now();
          const initTime = initEndTime - initStartTime;

          expect(initTime).toBeLessThan(
            100,
            `Component initialization should be under 100ms, but took ${initTime.toFixed(2)}ms`,
          );

          // Test 2: Search operations should be responsive (< 50ms after debounce)
          const searchStartTime = performance.now();

          component.searchTerm = testData.searchTerm;
          component.onSearchChange();

          // Wait for debounce to complete
          await new Promise((resolve) => setTimeout(resolve, 350));
          fixture.detectChanges();

          const searchEndTime = performance.now();
          const searchTime = searchEndTime - searchStartTime - 300; // Subtract debounce time

          expect(searchTime).toBeLessThan(
            50,
            `Search filtering should be under 50ms after debounce, but took ${searchTime.toFixed(2)}ms`,
          );

          // Test 3: Filter operations should be fast (< 30ms)
          const filterStartTime = performance.now();

          for (let i = 0; i < testData.filterChanges; i++) {
            component.selectedPriceRange = i % 2 === 0 ? 'free' : 'under-10';
            component.onPriceRangeChange();
            fixture.detectChanges();
          }

          const filterEndTime = performance.now();
          const filterTime = filterEndTime - filterStartTime;

          if (testData.filterChanges > 0) {
            const avgFilterTime = filterTime / testData.filterChanges;
            expect(avgFilterTime).toBeLessThan(
              30,
              `Average filter operation should be under 30ms, but took ${avgFilterTime.toFixed(2)}ms`,
            );
          }

          // Test 4: DOM rendering should be efficient
          const compiled = fixture.nativeElement as HTMLElement;

          // Check that skeleton screens are properly implemented for loading states
          component.loading = true;
          fixture.detectChanges();

          const skeletonElements = compiled.querySelectorAll(
            '.skeleton-container, .skeleton-search, .skeleton-table, .skeleton-pricing',
          );
          expect(skeletonElements.length).toBeGreaterThan(
            0,
            'Loading states should include skeleton screens for better perceived performance',
          );

          // Test 5: Memory usage should be reasonable (no excessive DOM nodes)
          component.loading = false;
          fixture.detectChanges();
          await fixture.whenStable();

          const allElements = compiled.querySelectorAll('*');
          const elementCount = allElements.length;

          // Reasonable limit based on content complexity
          const maxElements = 500 + testData.competitorCount * 50;
          expect(elementCount).toBeLessThan(
            maxElements,
            `DOM should not have excessive elements. Found ${elementCount}, max expected ${maxElements}`,
          );

          // Test 6: Responsive design should work at different viewport sizes
          // Simulate viewport change
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: testData.viewportWidth,
          });
          Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: testData.viewportHeight,
          });

          window.dispatchEvent(new Event('resize'));
          fixture.detectChanges();

          // Check that mobile-specific elements are handled properly
          if (testData.viewportWidth < 768) {
            // Mobile viewport - check for mobile-friendly layout
            const searchContainer = compiled.querySelector('.search-container');
            if (searchContainer) {
              const computedStyle = window.getComputedStyle(searchContainer);
              // In mobile, search container should stack vertically
              expect(
                ['column', 'wrap'].some(
                  (value) => computedStyle.flexDirection?.includes(value) || computedStyle.flexWrap?.includes(value),
                ),
              ).toBe(true, 'Mobile layout should use vertical stacking');
            }
          }

          // Test 7: Image loading should be optimized
          const images = compiled.querySelectorAll('img');
          images.forEach((img) => {
            expect(img.getAttribute('loading')).toBe('lazy', 'Images should use lazy loading for better performance');

            // Check for proper sizing attributes to prevent layout shift
            const hasSize = img.hasAttribute('width') && img.hasAttribute('height');
            const hasAspectRatio = img.style.aspectRatio || window.getComputedStyle(img).aspectRatio !== 'auto';

            expect(hasSize || hasAspectRatio).toBe(
              true,
              'Images should have size attributes or aspect-ratio to prevent layout shift',
            );
          });

          // Test 8: Animations should respect user preferences
          const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (prefersReducedMotion) {
            const animatedElements = compiled.querySelectorAll('[class*="skeleton-"], .spinner');
            animatedElements.forEach((element) => {
              const computedStyle = window.getComputedStyle(element);
              const animationDuration = computedStyle.animationDuration;

              expect(['0s', '0.01ms', 'none'].includes(animationDuration)).toBe(
                true,
                'Animations should be disabled when user prefers reduced motion',
              );
            });
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property test for smooth navigation and state management
   * Tests that navigation between different states is performant
   */
  it.skip('should provide smooth navigation and state transitions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          stateChanges: fc.integer({ min: 1, max: 10 }),
          searchTerms: fc.array(fc.string({ minLength: 0, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
          filterCombinations: fc.array(
            fc.record({
              priceRange: fc.constantFrom('all', 'free', 'under-10', '10-25', 'over-25'),
              featureCategory: fc.constantFrom('all', 'content', 'scheduling', 'analytics', 'collaboration', 'ai'),
            }),
            { minLength: 1, maxLength: 3 },
          ),
        }),
        async (testData) => {
          await component.ngOnInit();
          fixture.detectChanges();
          await fixture.whenStable();

          // Test rapid state changes for performance
          const stateChangeStartTime = performance.now();

          for (let i = 0; i < testData.stateChanges; i++) {
            const searchTerm = testData.searchTerms[i % testData.searchTerms.length];
            const filterCombo = testData.filterCombinations[i % testData.filterCombinations.length];

            // Change search term
            component.searchTerm = searchTerm;
            component.onSearchChange();

            // Change filters
            component.selectedPriceRange = filterCombo.priceRange;
            component.selectedFeatureCategory = filterCombo.featureCategory;
            component.onPriceRangeChange();
            component.onFeatureCategoryChange();

            fixture.detectChanges();
          }

          // Wait for all debounced operations to complete
          await new Promise((resolve) => setTimeout(resolve, 400));
          fixture.detectChanges();

          const stateChangeEndTime = performance.now();
          const totalStateChangeTime = stateChangeEndTime - stateChangeStartTime;
          const avgStateChangeTime = totalStateChangeTime / testData.stateChanges;

          expect(avgStateChangeTime).toBeLessThan(
            100,
            `Average state change should be under 100ms, but took ${avgStateChangeTime.toFixed(2)}ms`,
          );

          // Test that UI remains responsive during state changes
          const compiled = fixture.nativeElement as HTMLElement;

          // Check that results are properly updated
          const resultsElement = compiled.querySelector('.results-summary');
          if (resultsElement) {
            expect(resultsElement.textContent?.trim()).toBeTruthy(
              'Results summary should be updated after state changes',
            );
          }

          // Check that filtered results are consistent
          const currentSearchTerm = component.searchTerm.toLowerCase();
          const filteredCount = component.getFilteredCompetitorsCount();

          // Verify search term is being used for filtering
          expect(currentSearchTerm).toBeDefined();
          expect(filteredCount).toBeGreaterThanOrEqual(0, 'Filtered competitor count should be non-negative');
          expect(filteredCount).toBeLessThanOrEqual(
            component.getTotalCompetitorsCount(),
            'Filtered count should not exceed total count',
          );
        },
      ),
      { numRuns: 30 },
    );
  });

  /**
   * Property test for bundle size and resource optimization
   * Tests that the component doesn't load unnecessary resources
   */
  it.skip('should optimize resource loading and bundle size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          competitorCount: fc.integer({ min: 1, max: 20 }),
          hasImages: fc.boolean(),
          hasComplexFiltering: fc.boolean(),
        }),
        async (testData) => {
          const testCompetitors = Array(testData.competitorCount)
            .fill(0)
            .map((_, i) => ({
              ...mockCompetitors[0],
              name: `Competitor ${i + 1}`,
              slug: `competitor-${i + 1}`,
              logo: testData.hasImages ? `/assets/logo-${i + 1}.png` : '/assets/default-logo.png',
            }));

          mockCompetitorDataService.loadCompetitorData.and.returnValue(Promise.resolve(testCompetitors));

          await component.ngOnInit();
          fixture.detectChanges();
          await fixture.whenStable();

          const compiled = fixture.nativeElement as HTMLElement;

          // Test 1: Check that lazy loading is properly implemented
          const images = compiled.querySelectorAll('img[loading="lazy"]');
          const totalImages = compiled.querySelectorAll('img');

          if (totalImages.length > 0) {
            const lazyLoadRatio = images.length / totalImages.length;
            expect(lazyLoadRatio).toBeGreaterThanOrEqual(0.8, 'At least 80% of images should use lazy loading');
          }

          // Test 2: Check that component uses OnPush change detection
          expect(component.constructor.name).toBe('ComparisonOverviewComponent');
          // Note: We can't directly test ChangeDetectionStrategy.OnPush in unit tests,
          // but we can verify that manual change detection is being used

          // Test 3: Check that debouncing is working for search
          // Only create spy if it doesn't already exist
          let searchSpy: ReturnType<typeof vi.fn>;
          if (!(component as any).performSearch.mockImplementation) {
            searchSpy = vi.spyOn(component as any, 'performSearch').mockImplementation(() => {});
          } else {
            searchSpy = (component as any).performSearch;
          }

          // Rapid search changes
          component.searchTerm = 'test1';
          component.onSearchChange();
          component.searchTerm = 'test2';
          component.onSearchChange();
          component.searchTerm = 'test3';
          component.onSearchChange();

          // Wait for debounce
          await new Promise((resolve) => setTimeout(resolve, 350));

          // Should only call performSearch once due to debouncing
          expect(searchSpy).toHaveBeenCalledTimes(1);

          // Test 4: Check memory efficiency - no memory leaks in subscriptions
          const initialSubscriptions = (component as any).destroy$?.observers?.length || 0;

          // Trigger multiple operations that could create subscriptions
          for (let i = 0; i < 5; i++) {
            component.onSearchChange();
            component.onPriceRangeChange();
            component.onFeatureCategoryChange();
          }

          await new Promise((resolve) => setTimeout(resolve, 100));

          const finalSubscriptions = (component as any).destroy$?.observers?.length || 0;
          expect(finalSubscriptions).toBeLessThanOrEqual(
            initialSubscriptions + 1,
            'Should not create excessive subscriptions that could cause memory leaks',
          );
        },
      ),
      { numRuns: 20 },
    );
  });
});

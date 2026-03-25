import { TestBed } from '@angular/core/testing';
import { describe, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService - Property Tests', () => {
  let service: AnalyticsService;
  let mockGtag: ReturnType<typeof vi.fn>;
  let mockDataLayer: any[];

  beforeEach(() => {
    // Mock window.gtag and window.dataLayer
    mockDataLayer = [];
    mockGtag = vi.fn();

    (window as any).gtag = mockGtag;
    (window as any).dataLayer = mockDataLayer;

    TestBed.configureTestingModule({});
    service = TestBed.inject(AnalyticsService);
  });

  afterEach(() => {
    // Clean up global mocks
    delete (window as any).gtag;
    delete (window as any).dataLayer;
  });

  /**
   * Property 7: Analytics integration completeness
   * For any analytics event, the service should properly track the event with correct parameters
   * and ensure Google Analytics is called with appropriate data
   * **Validates: Requirements 5.5**
   */
  it.skip('Property 7: Analytics integration completeness - should track page views correctly for any page name', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        (pageName, pageTitle) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track page view
          service.trackPageView(pageName, pageTitle);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Verify page view tracking calls
          const calls = mockGtag.calls.all();
          expect(calls.length).toBeGreaterThan(0);

          // Check that at least one call includes page view data
          const hasPageViewCall = calls.some((call) => call.args[0] === 'event' && call.args[1] === 'page_view');
          expect(hasPageViewCall).toBe(true, 'Should include page_view event');

          // Check that page title is properly set
          const pageViewCall = calls.find((call) => call.args[0] === 'event' && call.args[1] === 'page_view');
          if (pageViewCall) {
            const eventData = pageViewCall.args[2];
            expect(eventData.page_title).toBe(pageTitle || pageName);
            expect(eventData.content_group1).toBe('competitor_comparison');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should track search events correctly for any search term', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        fc.integer({ min: 0, max: 50 }),
        (searchTerm, resultsCount) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track search
          service.trackSearch(searchTerm, resultsCount);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Find the search event call
          const searchCall = mockGtag.calls.all().find((call) => call.args[0] === 'event' && call.args[1] === 'search');

          expect(searchCall).toBeDefined('Should have search event call');

          if (searchCall) {
            const eventData = searchCall.args[2];
            expect(eventData.search_term).toBe(searchTerm);
            expect(eventData.event_category).toBe('competitor_comparison');
            expect(eventData.event_label).toBe('search_competitors');
            expect(eventData.value).toBe(resultsCount);
            expect(eventData.custom_parameter_1).toBe('search_functionality');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should track filter events correctly for any filter combination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('price_range', 'feature_category', 'custom_filter'),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.integer({ min: 0, max: 20 }),
        (filterType, filterValue, resultsCount) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track filter
          service.trackFilter(filterType, filterValue, resultsCount);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Find the filter event call
          const filterCall = mockGtag.calls
            .all()
            .find((call) => call.args[0] === 'event' && call.args[1] === 'filter_applied');

          expect(filterCall).toBeDefined('Should have filter_applied event call');

          if (filterCall) {
            const eventData = filterCall.args[2];
            expect(eventData.event_category).toBe('competitor_comparison');
            expect(eventData.event_label).toBe(`${filterType}_${filterValue}`);
            expect(eventData.filter_type).toBe(filterType);
            expect(eventData.filter_value).toBe(filterValue);
            expect(eventData.results_count).toBe(resultsCount);
            expect(eventData.custom_parameter_1).toBe('filter_functionality');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should track conversion events correctly for any conversion type', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
        (conversionType, competitorContext) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track conversion
          service.trackConversion(conversionType, competitorContext);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Find the conversion event calls
          const calls = mockGtag.calls.all();
          const conversionCall = calls.find((call) => call.args[0] === 'event' && call.args[1] === 'conversion');
          const specificConversionCall = calls.find(
            (call) => call.args[0] === 'event' && call.args[1] === conversionType,
          );

          expect(conversionCall).toBeDefined('Should have conversion event call');
          expect(specificConversionCall).toBeDefined('Should have specific conversion event call');

          if (conversionCall) {
            const eventData = conversionCall.args[2];
            expect(eventData.event_category).toBe('competitor_comparison');
            expect(eventData.event_label).toBe(conversionType);
            expect(eventData.conversion_type).toBe(conversionType);
            expect(eventData.competitor_context).toBe(competitorContext);
            expect(eventData.custom_parameter_1).toBe('conversion_tracking');
            expect(eventData.value).toBe(1);
          }

          if (specificConversionCall) {
            const eventData = specificConversionCall.args[2];
            expect(eventData.event_category).toBe('conversions');
            expect(eventData.source).toBe('competitor_comparison');
            expect(eventData.competitor_context).toBe(competitorContext);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should track competitor interactions correctly for any competitor and action', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(
          fc.record({
            additional_data: fc.string({ minLength: 1, maxLength: 50 }),
            numeric_value: fc.integer({ min: 0, max: 1000 }),
          }),
          { nil: undefined },
        ),
        (competitorName, action, details) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track competitor interaction
          service.trackCompetitorInteraction(competitorName, action, details);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Find the competitor interaction event call
          const interactionCall = mockGtag.calls
            .all()
            .find((call) => call.args[0] === 'event' && call.args[1] === 'competitor_interaction');

          expect(interactionCall).toBeDefined('Should have competitor_interaction event call');

          if (interactionCall) {
            const eventData = interactionCall.args[2];
            expect(eventData.event_category).toBe('competitor_comparison');
            expect(eventData.event_label).toBe(`${competitorName}_${action}`);
            expect(eventData.competitor_name).toBe(competitorName);
            expect(eventData.interaction_type).toBe(action);
            expect(eventData.custom_parameter_1).toBe('competitor_analysis');

            // Check that additional details are included if provided
            if (details) {
              Object.keys(details).forEach((key) => {
                expect((eventData as any)[key]).toBe((details as any)[key]);
              });
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should track engagement events correctly for any action', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.option(
          fc.record({
            engagement_type: fc.string({ minLength: 1, maxLength: 30 }),
            value: fc.integer({ min: 0, max: 100 }),
          }),
          { nil: undefined },
        ),
        (action, details) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track engagement
          service.trackEngagement(action, details);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Find the engagement event call
          const engagementCall = mockGtag.calls
            .all()
            .find((call) => call.args[0] === 'event' && call.args[1] === 'engagement');

          expect(engagementCall).toBeDefined('Should have engagement event call');

          if (engagementCall) {
            const eventData = engagementCall.args[2];
            expect(eventData.event_category).toBe('competitor_comparison');
            expect(eventData.event_label).toBe(action);
            expect(eventData.custom_parameter_1).toBe('engagement');

            // Check that additional details are included if provided
            if (details) {
              Object.keys(details).forEach((key) => {
                expect((eventData as any)[key]).toBe((details as any)[key]);
              });
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should track timing events correctly for any page and duration', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(3600) }), // 0.1 seconds to 1 hour
        (pageName, timeSpentSeconds) => {
          // Reset mock calls
          mockGtag.calls.reset();

          // Track time spent
          service.trackTimeSpent(pageName, timeSpentSeconds);

          // Verify gtag was called
          expect(mockGtag).toHaveBeenCalled();

          // Find the timing event call
          const timingCall = mockGtag.calls
            .all()
            .find((call) => call.args[0] === 'event' && call.args[1] === 'timing_complete');

          expect(timingCall).toBeDefined('Should have timing_complete event call');

          if (timingCall) {
            const eventData = timingCall.args[2];
            expect(eventData.name).toBe('page_engagement');
            const expectedValue = Math.round(timeSpentSeconds * 1000);
            if (isNaN(expectedValue)) {
              expect(isNaN(eventData.value)).toBe(true);
            } else {
              expect(eventData.value).toBe(expectedValue); // Should be in milliseconds
            }
            expect(eventData.event_category).toBe('competitor_comparison');
            expect(eventData.event_label).toBe(pageName);
            expect(eventData.custom_parameter_1).toBe('engagement_timing');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 7: Analytics integration completeness - should properly initialize and report readiness status', () => {
    fc.assert(
      fc.property(fc.boolean(), (hasGtag) => {
        // Setup window state
        if (hasGtag) {
          (window as any).gtag = mockGtag;
          (window as any).dataLayer = mockDataLayer;
        } else {
          delete (window as any).gtag;
          delete (window as any).dataLayer;
        }

        // Create new service instance to test initialization
        const testService = new AnalyticsService();

        // Check readiness status
        const isReady = testService.isAnalyticsReady();

        if (hasGtag) {
          expect(isReady).toBe(true, 'Should be ready when gtag is available');
        } else {
          // Service should still initialize gtag if it wasn't present
          expect(typeof (window as any).gtag).toBe('function', 'Should create gtag function');
          expect(Array.isArray((window as any).dataLayer)).toBe(true, 'Should create dataLayer array');
        }
      }),
      { numRuns: 50 },
    );
  });
});

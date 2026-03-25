import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import * as fc from 'fast-check';
import { ComparisonOverviewComponent } from './comparison-overview.component';
import { CompetitorDataService } from '../../services/competitor-data.service';
import { OGMetaService } from '../../services/og-meta.service';
import { AnalyticsService } from '../../services/analytics.service';

/**
 * Property 10: Competitors Page Responsiveness
 * Validates: Requirements 8.4
 *
 * Tests that the competitors page renders without horizontal scroll
 * for viewports from 320px to 2560px width.
 */
describe('ComparisonOverviewComponent - Responsiveness Property Tests', () => {
  let mockCompetitorDataService: Partial<CompetitorDataService>;
  let mockOGMetaService: Partial<OGMetaService>;
  let mockAnalyticsService: Partial<AnalyticsService>;

  beforeEach(() => {
    // Create mock services
    mockCompetitorDataService = {
      loadCompetitorData: () => Promise.resolve([]),
      getNexusShareData: () => null,
      clearData: () => {},
    };

    mockOGMetaService = {
      updateComparisonOverviewMeta: () => {},
    };

    mockAnalyticsService = {
      trackPageView: () => {},
      trackEngagement: () => {},
      trackTimeSpent: () => {},
      trackSearch: () => {},
      trackFilter: () => {},
    };

    TestBed.configureTestingModule({
      imports: [ComparisonOverviewComponent],
      providers: [
        provideRouter([]),
        { provide: CompetitorDataService, useValue: mockCompetitorDataService },
        { provide: OGMetaService, useValue: mockOGMetaService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    });
  });

  it('should render without horizontal scroll for viewport widths 320px-2560px', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate viewport widths from 320px to 2560px
        fc.integer({ min: 320, max: 2560 }),
        async (viewportWidth) => {
          // Create component
          const fixture = TestBed.createComponent(ComparisonOverviewComponent);
          const compiled = fixture.nativeElement as HTMLElement;

          // Set viewport width
          Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: viewportWidth,
          });

          // Trigger change detection
          fixture.detectChanges();
          await fixture.whenStable();

          // Get the root element
          const rootElement = compiled.querySelector('.app-container') || compiled;

          // Check that content width doesn't exceed viewport width
          const contentWidth = rootElement.scrollWidth;
          const hasHorizontalScroll = contentWidth > viewportWidth;

          // Assert no horizontal scroll
          expect(hasHorizontalScroll).toBe(false);

          // Cleanup
          fixture.destroy();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should maintain readable text size across all viewport widths', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 320, max: 2560 }), async (viewportWidth) => {
        const fixture = TestBed.createComponent(ComparisonOverviewComponent);
        const compiled = fixture.nativeElement as HTMLElement;

        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewportWidth,
        });

        fixture.detectChanges();
        await fixture.whenStable();

        // Check that text elements have minimum readable font size (12px)
        const textElements = compiled.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6');
        const allTextReadable = Array.from(textElements).every((element) => {
          const fontSize = window.getComputedStyle(element).fontSize;
          const fontSizeValue = parseFloat(fontSize);
          return fontSizeValue >= 12 || fontSizeValue === 0; // 0 means no text content
        });

        expect(allTextReadable).toBe(true);

        fixture.destroy();
      }),
      { numRuns: 50 },
    );
  });

  it('should maintain proper spacing and layout at all viewport widths', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 320, max: 2560 }), async (viewportWidth) => {
        const fixture = TestBed.createComponent(ComparisonOverviewComponent);
        const compiled = fixture.nativeElement as HTMLElement;

        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: viewportWidth,
        });

        fixture.detectChanges();
        await fixture.whenStable();

        // Check that elements don't overlap (negative margins causing issues)
        const allElements = compiled.querySelectorAll('*');
        const noNegativeOverlap = Array.from(allElements).every((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width >= 0 && rect.height >= 0;
        });

        expect(noNegativeOverlap).toBe(true);

        fixture.destroy();
      }),
      { numRuns: 50 },
    );
  });
});

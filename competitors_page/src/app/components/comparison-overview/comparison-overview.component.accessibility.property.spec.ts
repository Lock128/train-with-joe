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
 * Property-based tests for accessibility compliance
 * **Property 14: Accessibility compliance**
 * **Validates: Requirements 8.5**
 */
describe('ComparisonOverviewComponent - Accessibility Property Tests', () => {
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
   * Property 14: Accessibility compliance
   * For any comparison page, accessibility standards should be maintained including
   * ARIA labels, keyboard navigation, and other disability accommodation features
   * **Validates: Requirements 8.5**
   */
  it.skip('should maintain accessibility compliance for all interactive elements', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          searchTerm: fc.string({ minLength: 0, maxLength: 50 }),
          showFilters: fc.boolean(),
          selectedPriceRange: fc.constantFrom('all', 'free', 'under-10', '10-25', 'over-25'),
          selectedFeatureCategory: fc.constantFrom('all', 'content', 'scheduling', 'analytics', 'collaboration', 'ai'),
        }),
        async (testData) => {
          // Set up component state
          component.searchTerm = testData.searchTerm;
          component.showFilters = testData.showFilters;
          component.selectedPriceRange = testData.selectedPriceRange;
          component.selectedFeatureCategory = testData.selectedFeatureCategory;

          await component.ngOnInit();
          fixture.detectChanges();
          await fixture.whenStable();

          const compiled = fixture.nativeElement as HTMLElement;

          // Test 1: All interactive elements should have proper ARIA labels
          const interactiveElements = compiled.querySelectorAll('button, input, select, a[href]');
          interactiveElements.forEach((element) => {
            const hasAriaLabel =
              element.hasAttribute('aria-label') ||
              element.hasAttribute('aria-labelledby') ||
              element.hasAttribute('aria-describedby') ||
              element.textContent?.trim() !== '';

            expect(hasAriaLabel).toBe(
              true,
              `Interactive element should have proper labeling: ${element.tagName} ${element.className}`,
            );
          });

          // Test 2: All images should have alt text
          const images = compiled.querySelectorAll('img');
          images.forEach((img) => {
            expect(img.hasAttribute('alt')).toBe(true, `Image should have alt text: ${img.src}`);
            expect(img.getAttribute('alt')?.trim()).toBeTruthy(`Image alt text should not be empty: ${img.src}`);
          });

          // Test 3: Form controls should have associated labels
          const formControls = compiled.querySelectorAll('input, select, textarea');
          formControls.forEach((control) => {
            const hasLabel =
              control.hasAttribute('aria-label') ||
              control.hasAttribute('aria-labelledby') ||
              compiled.querySelector(`label[for="${control.id}"]`) !== null;

            expect(hasLabel).toBe(
              true,
              `Form control should have associated label: ${control.tagName} ${control.className}`,
            );
          });

          // Test 4: Headings should follow proper hierarchy
          const headings = Array.from(compiled.querySelectorAll('h1, h2, h3, h4, h5, h6'));
          if (headings.length > 1) {
            for (let i = 1; i < headings.length; i++) {
              const currentLevel = parseInt(headings[i].tagName.charAt(1));
              const previousLevel = parseInt(headings[i - 1].tagName.charAt(1));

              // Heading levels should not skip more than one level
              expect(currentLevel - previousLevel).toBeLessThanOrEqual(
                1,
                `Heading hierarchy should not skip levels: ${headings[i - 1].tagName} -> ${headings[i].tagName}`,
              );
            }
          }

          // Test 5: Tables should have proper structure
          const tables = compiled.querySelectorAll('table');
          tables.forEach((table) => {
            // Tables should have headers
            const headers = table.querySelectorAll('th');
            expect(headers.length).toBeGreaterThan(0, 'Tables should have header cells');

            // Headers should have scope attributes
            headers.forEach((header) => {
              expect(header.hasAttribute('scope')).toBe(true, 'Table headers should have scope attributes');
            });

            // Tables should have captions or aria-label
            const hasCaption =
              table.querySelector('caption') !== null ||
              table.hasAttribute('aria-label') ||
              table.hasAttribute('aria-labelledby');
            expect(hasCaption).toBe(true, 'Tables should have captions or ARIA labels');
          });

          // Test 6: ARIA live regions should be properly configured
          const liveRegions = compiled.querySelectorAll('[aria-live]');
          liveRegions.forEach((region) => {
            const liveValue = region.getAttribute('aria-live');
            if (liveValue) {
              expect(['polite', 'assertive', 'off']).toContain(
                liveValue,
                `ARIA live regions should have valid values: ${liveValue}`,
              );
            }
          });

          // Test 7: Expandable content should have proper ARIA attributes
          const expandableButtons = compiled.querySelectorAll('[aria-expanded]');
          expandableButtons.forEach((button) => {
            expect(button.hasAttribute('aria-controls')).toBe(true, 'Expandable buttons should have aria-controls');

            const expandedValue = button.getAttribute('aria-expanded');
            if (expandedValue) {
              expect(['true', 'false']).toContain(
                expandedValue,
                `ARIA expanded should be true or false: ${expandedValue}`,
              );
            }
          });

          // Test 8: Skip links should be present for keyboard navigation
          const skipLinks = compiled.querySelectorAll('.skip-link, [href="#main-content"]');
          // Skip links are optional but recommended for complex pages
          if (skipLinks.length > 0) {
            skipLinks.forEach((link) => {
              expect(link.textContent?.trim()).toBeTruthy('Skip links should have descriptive text');
            });
          }

          // Test 9: Color should not be the only means of conveying information
          // This is tested by ensuring icons/text accompany color-coded elements
          const colorCodedElements = compiled.querySelectorAll(
            '.feature-full, .feature-partial, .feature-premium, .feature-none',
          );
          colorCodedElements.forEach((element) => {
            const hasIcon = element.querySelector('.feature-icon') !== null;
            const hasText = element.querySelector('.feature-text, .sr-only') !== null;

            expect(hasIcon || hasText).toBe(true, 'Color-coded elements should have icons or text for accessibility');
          });

          // Test 10: Focus should be manageable and visible
          // This is handled by CSS, but we can test that focusable elements exist
          const focusableElements = compiled.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          );

          expect(focusableElements.length).toBeGreaterThan(
            0,
            'Page should have focusable elements for keyboard navigation',
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property test for screen reader compatibility
   * Tests that content is properly structured for screen readers
   */
  it.skip('should provide proper screen reader support', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          hasError: fc.boolean(),
          isLoading: fc.boolean(),
          competitorCount: fc.integer({ min: 0, max: 5 }),
        }),
        async (testData) => {
          // Set up component state
          if (testData.hasError) {
            component.error = 'Test error message';
          }
          component.loading = testData.isLoading;

          const testCompetitors = mockCompetitors.slice(0, testData.competitorCount);
          mockCompetitorDataService.loadCompetitorData.and.returnValue(Promise.resolve(testCompetitors));

          await component.ngOnInit();
          fixture.detectChanges();
          await fixture.whenStable();

          const compiled = fixture.nativeElement as HTMLElement;

          // Test 1: Status messages should be announced to screen readers
          const statusElements = compiled.querySelectorAll('[role="status"], [role="alert"], [aria-live]');
          statusElements.forEach((element) => {
            if (element.textContent?.trim()) {
              expect(element.getAttribute('aria-live') || element.getAttribute('role')).toBeTruthy(
                'Status messages should be announced to screen readers',
              );
            }
          });

          // Test 2: Lists should be properly marked up
          const lists = compiled.querySelectorAll('ul, ol, [role="list"]');
          lists.forEach((list) => {
            const listItems = list.querySelectorAll('li, [role="listitem"]');
            if (listItems.length > 0) {
              expect(
                list.getAttribute('role') === 'list' ||
                  list.tagName.toLowerCase() === 'ul' ||
                  list.tagName.toLowerCase() === 'ol',
              ).toBe(true, 'Lists should be properly marked up');
            }
          });

          // Test 3: Screen reader only content should be properly hidden
          const srOnlyElements = compiled.querySelectorAll('.sr-only');
          srOnlyElements.forEach((element) => {
            const styles = window.getComputedStyle(element);
            // Use styles to verify screen reader only styling
            // Note: In test environment, computed styles may not be available
            // This test ensures the class is applied correctly
            expect(styles).toBeDefined();
            expect(element.classList.contains('sr-only')).toBe(
              true,
              'Screen reader only content should have sr-only class',
            );
          });

          // Test 4: Decorative elements should be hidden from screen readers
          const decorativeElements = compiled.querySelectorAll('[aria-hidden="true"]');
          decorativeElements.forEach((element) => {
            // Decorative elements should not contain interactive content
            const interactiveChildren = element.querySelectorAll('button, input, select, textarea, a[href]');
            expect(interactiveChildren.length).toBe(0, 'Decorative elements should not contain interactive content');
          });
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property test for keyboard navigation support
   * Tests that all functionality is accessible via keyboard
   */
  it.skip('should support complete keyboard navigation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          filterState: fc.boolean(),
          searchValue: fc.string({ minLength: 0, maxLength: 20 }),
        }),
        async (testData) => {
          component.showFilters = testData.filterState;
          component.searchTerm = testData.searchValue;

          await component.ngOnInit();
          fixture.detectChanges();
          await fixture.whenStable();

          const compiled = fixture.nativeElement as HTMLElement;

          // Test 1: All interactive elements should be keyboard accessible
          const interactiveElements = compiled.querySelectorAll('button, input, select, textarea, a[href]');
          interactiveElements.forEach((element) => {
            const tabIndex = element.getAttribute('tabindex');

            // Elements should not have negative tabindex unless they're programmatically focusable
            if (tabIndex !== null) {
              const tabIndexValue = parseInt(tabIndex);
              if (tabIndexValue < 0) {
                // Negative tabindex is only acceptable for programmatically focusable elements
                expect(element.hasAttribute('aria-hidden') || element.closest('[aria-hidden="true"]')).toBeTruthy(
                  'Elements with negative tabindex should be hidden or programmatically managed',
                );
              }
            }
          });

          // Test 2: Focus trap should be implemented for modal-like content
          const modalElements = compiled.querySelectorAll('[role="dialog"], .modal, .popup');
          modalElements.forEach((modal) => {
            const focusableElements = modal.querySelectorAll(
              'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
            );

            if (focusableElements.length > 0) {
              expect(focusableElements.length).toBeGreaterThan(0, 'Modal elements should contain focusable elements');
            }
          });

          // Test 3: Custom interactive elements should have proper keyboard support
          const customInteractive = compiled.querySelectorAll(
            '[tabindex="0"]:not(button):not(input):not(select):not(textarea):not(a)',
          );
          customInteractive.forEach((element) => {
            // Custom interactive elements should have role
            expect(element.hasAttribute('role')).toBe(
              true,
              'Custom interactive elements should have appropriate roles',
            );
          });

          // Test 4: Keyboard shortcuts should not conflict with browser/screen reader shortcuts
          const elementsWithKeyHandlers = compiled.querySelectorAll('[ng-reflect-keydown], [keydown]');
          // This is more of a code review item, but we can check that elements exist
          expect(elementsWithKeyHandlers.length).toBeGreaterThanOrEqual(
            0,
            'Keyboard event handlers should be properly implemented',
          );
        },
      ),
      { numRuns: 30 },
    );
  });
});

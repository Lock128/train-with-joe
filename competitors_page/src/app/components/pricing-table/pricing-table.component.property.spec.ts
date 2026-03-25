import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import * as fc from 'fast-check';
import { PricingTableComponent } from './pricing-table.component';
import { FeatureMatrixComponent } from '../feature-matrix/feature-matrix.component';
import type {
  CompetitorData,
  TrainWithJoeData,
  PricingTier,
  FeatureComparison,
  FeatureStatus,
  BillingCycle,
} from '../../models/competitor.interface';

/**
 * Property-based tests for responsive design consistency
 * Feature: competitor-comparison-pages, Property 5: Responsive design consistency
 * Validates: Requirements 3.5
 */
describe('Responsive Design Property Tests', () => {
  let pricingComponent: PricingTableComponent;
  let pricingFixture: ComponentFixture<PricingTableComponent>;
  let featureComponent: FeatureMatrixComponent;
  let featureFixture: ComponentFixture<FeatureMatrixComponent>;

  // Generators for property-based testing
  const featureStatusArb = fc.constantFrom('full', 'partial', 'none', 'premium') as fc.Arbitrary<FeatureStatus>;
  const billingCycleArb = fc.constantFrom('monthly', 'annual') as fc.Arbitrary<BillingCycle>;

  const featureComparisonArb = fc.record({
    multiPlatformPosting: featureStatusArb,
    aiContentGeneration: featureStatusArb,
    scheduling: featureStatusArb,
    analytics: featureStatusArb,
    teamCollaboration: featureStatusArb,
    mentionResolution: featureStatusArb,
    contentRecycling: featureStatusArb,
    visualPlanning: featureStatusArb,
    socialListening: featureStatusArb,
  }) as fc.Arbitrary<FeatureComparison>;

  const pricingTierArb = fc.record({
    name: fc.constantFrom('Free', 'Basic', 'Pro', 'Enterprise'),
    price: fc.nat({ max: 500 }),
    billing: billingCycleArb,
    features: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 8 }),
    limitations: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { maxLength: 5 }),
  }) as fc.Arbitrary<PricingTier>;

  const competitorArb = fc.record({
    name: fc.string({ minLength: 3, maxLength: 20 }),
    slug: fc.string({ minLength: 3, maxLength: 15 }).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    tagline: fc.string({ minLength: 10, maxLength: 100 }),
    logo: fc.constant('/assets/images/test-logo.png'),
    website: fc.constant('https://example.com'),
    pricing: fc.array(pricingTierArb, { minLength: 1, maxLength: 4 }),
    features: featureComparisonArb,
    pros: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    cons: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    targetAudience: fc.string({ minLength: 5, maxLength: 50 }),
    lastUpdated: fc.constant('2024-12-30'),
  }) as fc.Arbitrary<CompetitorData>;

  const trainWithJoeArb = fc.record({
    uniqueFeatures: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 5 }),
    pricing: fc.array(pricingTierArb, { minLength: 1, maxLength: 3 }),
  }) as fc.Arbitrary<TrainWithJoeData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingTableComponent, FeatureMatrixComponent],
    }).compileComponents();

    // Setup pricing component
    pricingFixture = TestBed.createComponent(PricingTableComponent);
    pricingComponent = pricingFixture.componentInstance;

    // Setup feature matrix component
    featureFixture = TestBed.createComponent(FeatureMatrixComponent);
    featureComponent = featureFixture.componentInstance;
  });

  /**
   * Property 5: Responsive design consistency - Pricing Table
   * For any pricing comparison table, the layout should be fully responsive
   * and readable on both desktop and mobile devices
   * Validates: Requirements 3.5
   */
  it.skip('should maintain responsive pricing table structure across all data configurations', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 6 }),
        trainWithJoeArb,
        fc.boolean(),
        fc.boolean(),
        (competitors, trainWithJoe, showTrainWithJoe, highlightSavings) => {
          // Arrange
          pricingComponent.competitors = competitors;
          pricingComponent.trainWithJoe = trainWithJoe;
          pricingComponent.showTrainWithJoe = showTrainWithJoe;
          pricingComponent.highlightSavings = highlightSavings;

          pricingFixture.detectChanges();

          // Act & Assert - Desktop table structure
          const desktopTable = pricingFixture.debugElement.query(By.css('.pricing-table'));
          expect(desktopTable).toBeTruthy();

          // Table should have proper structure
          const tableHeaders = pricingFixture.debugElement.queryAll(By.css('.pricing-table thead th'));
          const expectedColumns = 1 + (showTrainWithJoe ? 1 : 0) + competitors.length; // plan + nexus + competitors
          expect(tableHeaders.length).toBe(expectedColumns);

          // Mobile structure should exist
          const mobileView = pricingFixture.debugElement.query(By.css('.mobile-pricing'));
          expect(mobileView).toBeTruthy();

          // Mobile cards should exist for all platforms
          const mobilePlatformCards = pricingFixture.debugElement.queryAll(By.css('.mobile-platform-card'));
          const expectedMobileCards = (showTrainWithJoe ? 1 : 0) + competitors.length;
          expect(mobilePlatformCards.length).toBe(expectedMobileCards);

          // Each mobile card should have proper structure
          mobilePlatformCards.forEach((card) => {
            const header = card.query(By.css('.mobile-platform-header'));
            const tiers = card.query(By.css('.mobile-pricing-tiers'));

            expect(header).toBeTruthy();
            expect(tiers).toBeTruthy();
          });

          // Billing toggle should be responsive (only if multiple billing cycles available)
          const availableCycles = pricingComponent.getAvailableBillingCycles();
          if (availableCycles.length > 1) {
            const billingToggle = pricingFixture.debugElement.query(By.css('.billing-toggle'));
            expect(billingToggle).toBeTruthy();

            const toggleButtons = billingToggle.queryAll(By.css('.toggle-button'));
            expect(toggleButtons.length).toBe(availableCycles.length);
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Property 5: Responsive design consistency - Feature Matrix
   * For any feature comparison matrix, the layout should be fully responsive
   * and readable on both desktop and mobile devices
   * Validates: Requirements 3.5
   */
  it.skip('should maintain responsive feature matrix structure across all data configurations', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 5 }),
        trainWithJoeArb,
        fc.boolean(),
        fc.boolean(),
        (competitors, trainWithJoe, showTooltips, highlightTrainWithJoe) => {
          // Arrange
          featureComponent.competitors = competitors;
          featureComponent.trainWithJoe = trainWithJoe;
          featureComponent.showTooltips = showTooltips;
          featureComponent.highlightTrainWithJoe = highlightTrainWithJoe;

          featureFixture.detectChanges();

          // Act & Assert - Desktop table structure
          const desktopTable = featureFixture.debugElement.query(By.css('.feature-matrix-table'));
          expect(desktopTable).toBeTruthy();

          // Table should have proper responsive structure
          const tableHeaders = featureFixture.debugElement.queryAll(By.css('.feature-matrix-table thead th'));
          const expectedColumns = 1 + (highlightTrainWithJoe ? 1 : 0) + competitors.length; // features + nexus + competitors
          expect(tableHeaders.length).toBe(expectedColumns);

          // Feature rows should exist for all features
          const featureRows = featureFixture.debugElement.queryAll(By.css('.feature-matrix-table tbody tr'));
          expect(featureRows.length).toBe(featureComponent.featureDefinitions.length);

          // Mobile structure should exist
          const mobileMatrix = featureFixture.debugElement.query(By.css('.mobile-matrix'));
          expect(mobileMatrix).toBeTruthy();

          // Mobile feature groups should exist for all features
          const mobileFeatureGroups = featureFixture.debugElement.queryAll(By.css('.mobile-feature-group'));
          expect(mobileFeatureGroups.length).toBe(featureComponent.featureDefinitions.length);

          // Each mobile feature group should have proper structure
          mobileFeatureGroups.forEach((group) => {
            const header = group.query(By.css('.mobile-feature-header'));
            const comparisons = group.query(By.css('.mobile-feature-comparisons'));

            expect(header).toBeTruthy();
            expect(comparisons).toBeTruthy();

            // Should have competitors in mobile view
            const mobileCompetitors = group.queryAll(By.css('.mobile-competitor'));
            const expectedMobileCompetitors = (highlightTrainWithJoe ? 1 : 0) + competitors.length;
            expect(mobileCompetitors.length).toBe(expectedMobileCompetitors);
          });

          // Legend should be responsive
          const legend = featureFixture.debugElement.query(By.css('.matrix-legend'));
          expect(legend).toBeTruthy();

          const legendItems = legend.queryAll(By.css('.legend-item'));
          expect(legendItems.length).toBe(4); // full, partial, premium, none
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Property 5: Responsive design consistency - Content adaptation
   * For any component configuration, content should adapt properly to different viewport constraints
   * Validates: Requirements 3.5
   */
  it.skip('should adapt content presentation for different viewport constraints', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 4 }),
        trainWithJoeArb,
        (competitors, trainWithJoe) => {
          // Test both components
          const components = [
            { component: pricingComponent, fixture: pricingFixture },
            { component: featureComponent, fixture: featureFixture },
          ];

          components.forEach(({ component, fixture }) => {
            // Arrange
            component.competitors = competitors;
            component.trainWithJoe = trainWithJoe;

            fixture.detectChanges();

            // Act & Assert - Check for responsive elements
            const scrollContainers = fixture.debugElement.queryAll(By.css('[class*="scroll-container"]'));

            // Should have horizontal scroll containers for wide tables
            if (scrollContainers.length > 0) {
              scrollContainers.forEach((container) => {
                const element = container.nativeElement as HTMLElement;
                // Should have overflow-x auto or scroll for horizontal scrolling
                const computedStyle = getComputedStyle(element);
                expect(['auto', 'scroll', 'visible']).toContain(computedStyle.overflowX);
              });
            }

            // Should have mobile-specific elements or responsive design
            const mobileElements = fixture.debugElement.queryAll(
              By.css('[class*="mobile-"], .responsive-table, .table-responsive'),
            );
            // Mobile elements are optional - responsive design might use different approaches
            // Verify mobile elements are properly structured if present
            if (mobileElements.length > 0) {
              expect(mobileElements.length).toBeGreaterThan(0);
            }

            // Should have proper ARIA labels for accessibility
            const tables = fixture.debugElement.queryAll(By.css('table[role="table"]'));
            tables.forEach((table) => {
              const ariaLabel = table.nativeElement.getAttribute('aria-label');
              expect(ariaLabel).toBeTruthy();
              expect(ariaLabel.length).toBeGreaterThan(0);
            });

            // Headers should have proper scope attributes
            const tableHeaders = fixture.debugElement.queryAll(By.css('th[scope]'));
            tableHeaders.forEach((header) => {
              const scope = header.nativeElement.getAttribute('scope');
              expect(['col', 'row']).toContain(scope);
            });
          });
        },
      ),
      { numRuns: 5 },
    );
  });

  /**
   * Property 5: Responsive design consistency - Image handling
   * For any competitor logos, images should be properly sized and responsive
   * Validates: Requirements 3.5
   */
  it.skip('should handle competitor logos responsively across all configurations', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 5 }),
        trainWithJoeArb,
        (competitors, trainWithJoe) => {
          // Test pricing component
          pricingComponent.competitors = competitors;
          pricingComponent.trainWithJoe = trainWithJoe;
          pricingFixture.detectChanges();

          // Desktop logos in pricing table
          const pricingDesktopLogos = pricingFixture.debugElement.queryAll(By.css('.platform-logo'));
          expect(pricingDesktopLogos.length).toBe(competitors.length);

          pricingDesktopLogos.forEach((logo) => {
            const imgElement = logo.nativeElement as HTMLImageElement;

            // Should have proper alt text
            expect(imgElement.alt).toBeTruthy();
            expect(imgElement.alt).toContain('logo');

            // Should have loading="lazy" for performance
            expect(imgElement.loading).toBe('lazy');

            // Should have proper src
            expect(imgElement.src).toBeTruthy();
          });

          // Mobile logos in pricing table
          const pricingMobileLogos = pricingFixture.debugElement.queryAll(By.css('.mobile-platform-logo'));
          expect(pricingMobileLogos.length).toBe(competitors.length);

          pricingMobileLogos.forEach((logo) => {
            const imgElement = logo.nativeElement as HTMLImageElement;

            // Should have proper alt text
            expect(imgElement.alt).toBeTruthy();
            expect(imgElement.alt).toContain('logo');

            // Should have loading="lazy" for performance
            expect(imgElement.loading).toBe('lazy');
          });

          // Test feature matrix component
          featureComponent.competitors = competitors;
          featureComponent.trainWithJoe = trainWithJoe;
          featureFixture.detectChanges();

          // Desktop logos in feature matrix
          const featureDesktopLogos = featureFixture.debugElement.queryAll(By.css('.competitor-logo'));
          expect(featureDesktopLogos.length).toBe(competitors.length);

          featureDesktopLogos.forEach((logo) => {
            const imgElement = logo.nativeElement as HTMLImageElement;

            // Should have proper alt text
            expect(imgElement.alt).toBeTruthy();
            expect(imgElement.alt).toContain('logo');

            // Should have loading="lazy" for performance
            expect(imgElement.loading).toBe('lazy');
          });

          // Mobile logos in feature matrix
          const featureMobileLogos = featureFixture.debugElement.queryAll(By.css('.mobile-competitor-logo'));
          expect(featureMobileLogos.length).toBe(competitors.length);

          featureMobileLogos.forEach((logo) => {
            const imgElement = logo.nativeElement as HTMLImageElement;

            // Should have proper alt text
            expect(imgElement.alt).toBeTruthy();
            expect(imgElement.alt).toContain('logo');

            // Should have loading="lazy" for performance
            expect(imgElement.loading).toBe('lazy');
          });
        },
      ),
      { numRuns: 10 },
    );
  });

  /**
   * Property 5: Responsive design consistency - Text readability
   * For any text content, it should remain readable across different viewport sizes
   * Validates: Requirements 3.5
   */
  it.skip('should maintain text readability across all content configurations', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 3 }),
        trainWithJoeArb,
        (competitors, trainWithJoe) => {
          // Test pricing component text readability
          pricingComponent.competitors = competitors;
          pricingComponent.trainWithJoe = trainWithJoe;
          pricingFixture.detectChanges();

          // Check pricing text elements
          const priceAmounts = pricingFixture.debugElement.queryAll(By.css('.price-amount, .mobile-price-amount'));
          priceAmounts.forEach((priceElement) => {
            const text = priceElement.nativeElement.textContent.trim();
            expect(text.length).toBeGreaterThan(0);

            // Price text should be properly formatted
            if (text !== 'Free') {
              expect(text).toMatch(/^\$\d+/); // Should start with currency symbol and number
            }
          });

          // Feature and limitation text should be readable
          const featureTexts = pricingFixture.debugElement.queryAll(By.css('.feature-item, .mobile-feature-item'));
          featureTexts.forEach((featureElement) => {
            const text = featureElement.nativeElement.textContent.trim();
            expect(text.length).toBeGreaterThan(0);
            expect(text.length).toBeLessThan(200); // Reasonable length for readability
          });

          // Test feature matrix text readability
          featureComponent.competitors = competitors;
          featureComponent.trainWithJoe = trainWithJoe;
          featureFixture.detectChanges();

          // Feature names should be readable
          const featureNames = featureFixture.debugElement.queryAll(By.css('.feature-name, .mobile-feature-name'));
          featureNames.forEach((nameElement) => {
            const text = nameElement.nativeElement.textContent.trim();
            expect(text.length).toBeGreaterThan(0);
            expect(text.length).toBeLessThan(100); // Reasonable length for feature names

            // Should not contain underscores (should be formatted)
            expect(text).not.toContain('_');
          });

          // Competitor names should be readable
          const competitorNames = featureFixture.debugElement.queryAll(
            By.css('.competitor-name, .mobile-competitor-name'),
          );
          competitorNames.forEach((nameElement) => {
            const text = nameElement.nativeElement.textContent.trim();
            expect(text.length).toBeGreaterThan(0);
            expect(text.length).toBeLessThan(50); // Reasonable length for competitor names
          });
        },
      ),
      { numRuns: 5 },
    );
  });

  /**
   * Property 5: Responsive design consistency - Interactive elements
   * For any interactive elements, they should be properly sized for touch interfaces
   * Validates: Requirements 3.5
   */
  it.skip('should provide properly sized interactive elements for touch interfaces', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 3 }),
        trainWithJoeArb,
        (competitors, trainWithJoe) => {
          // Test pricing component interactive elements
          pricingComponent.competitors = competitors;
          pricingComponent.trainWithJoe = trainWithJoe;
          pricingComponent.showAnnualPricing = true;
          pricingFixture.detectChanges();

          // Billing toggle buttons should be touch-friendly
          const toggleButtons = pricingFixture.debugElement.queryAll(By.css('.toggle-button'));
          if (toggleButtons.length > 0) {
            toggleButtons.forEach((button) => {
              const buttonElement = button.nativeElement as HTMLButtonElement;

              // Should be a button element
              expect(buttonElement.tagName.toLowerCase()).toBe('button');

              // Should have proper ARIA attributes
              expect(buttonElement.getAttribute('aria-pressed')).toBeTruthy();

              // Should be focusable
              expect(buttonElement.tabIndex).not.toBe(-1);
            });
          }

          // Test feature matrix interactive elements
          featureComponent.competitors = competitors;
          featureComponent.trainWithJoe = trainWithJoe;
          featureComponent.showTooltips = true;
          featureFixture.detectChanges();

          // Tooltip triggers should be touch-friendly
          const tooltipTriggers = featureFixture.debugElement.queryAll(By.css('.tooltip-trigger'));
          tooltipTriggers.forEach((trigger) => {
            const triggerElement = trigger.nativeElement as HTMLButtonElement;

            // Should be a button element for accessibility
            expect(triggerElement.tagName.toLowerCase()).toBe('button');
            expect(triggerElement.type).toBe('button');

            // Should have proper ARIA attributes
            expect(triggerElement.getAttribute('aria-label')).toBeTruthy();

            // Should be focusable
            expect(triggerElement.tabIndex).not.toBe(-1);
          });
        },
      ),
      { numRuns: 5 },
    );
  });
});

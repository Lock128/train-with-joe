import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import * as fc from 'fast-check';
import { FeatureMatrixComponent } from './feature-matrix.component';
import type {
  CompetitorData,
  NexusShareData,
  FeatureComparison,
  FeatureStatus,
} from '../../models/competitor.interface';

/**
 * Property-based tests for FeatureMatrixComponent
 * Feature: competitor-comparison-pages, Property 4: Interactive feature explanations
 * Validates: Requirements 3.4
 */
describe('FeatureMatrixComponent - Property Tests', () => {
  let component: FeatureMatrixComponent;
  let fixture: ComponentFixture<FeatureMatrixComponent>;

  // Generators for property-based testing
  const featureStatusArb = fc.constantFrom('full', 'partial', 'none', 'premium') as fc.Arbitrary<FeatureStatus>;

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

  const competitorArb = fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    slug: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    tagline: fc.string({ minLength: 1, maxLength: 100 }),
    logo: fc.constant('/assets/images/test-logo.png'),
    website: fc.constant('https://example.com'),
    pricing: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        price: fc.nat({ max: 1000 }),
        billing: fc.constantFrom('monthly', 'annual'),
        features: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        limitations: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 3 }),
      }),
      { minLength: 1, maxLength: 3 },
    ),
    features: featureComparisonArb,
    pros: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    cons: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
    targetAudience: fc.string({ minLength: 1, maxLength: 50 }),
    lastUpdated: fc.constant('2024-12-30'),
  }) as fc.Arbitrary<CompetitorData>;

  const nexusShareArb = fc.record({
    uniqueFeatures: fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
    pricing: fc.array(
      fc.record({
        name: fc.string({ minLength: 1, maxLength: 20 }),
        price: fc.nat({ max: 100 }),
        billing: fc.constantFrom('monthly', 'annual'),
        features: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        limitations: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 2 }),
      }),
      { minLength: 1, maxLength: 2 },
    ),
  }) as fc.Arbitrary<NexusShareData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureMatrixComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureMatrixComponent);
    component = fixture.componentInstance;
  });

  /**
   * Property 4: Interactive feature explanations
   * For any feature that requires explanation in the comparison matrix,
   * tooltips or expandable details should be available and functional
   * Validates: Requirements 3.4
   */
  it.skip('should provide interactive tooltips for all features when tooltips are enabled', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 5 }),
        nexusShareArb,
        fc.boolean(),
        (competitors, nexusShare, highlightNexusShare) => {
          // Arrange
          component.competitors = competitors;
          component.nexusShare = nexusShare;
          component.showTooltips = true; // Enable tooltips for this test
          component.highlightNexusShare = highlightNexusShare;

          fixture.detectChanges();

          // Act & Assert
          // Every feature should have a tooltip trigger when tooltips are enabled
          const tooltipTriggers = fixture.debugElement.queryAll(By.css('.tooltip-trigger'));

          // Should have one tooltip trigger per feature definition
          expect(tooltipTriggers.length).toBe(component.featureDefinitions.length);

          // Each tooltip trigger should be functional
          tooltipTriggers.forEach((trigger, index) => {
            const featureKey = component.featureDefinitions[index].key;

            // Tooltip trigger should have proper accessibility attributes
            const triggerElement = trigger.nativeElement as HTMLButtonElement;
            expect(triggerElement.getAttribute('aria-label')).toContain('Learn more about');
            expect(triggerElement.getAttribute('type')).toBe('button');

            // Tooltip should show when triggered
            const mouseEvent = new MouseEvent('mouseenter');
            component.showTooltip(featureKey, mouseEvent);
            expect(component.activeTooltip).toBe(featureKey);

            // Tooltip content should be available
            const description = component.getFeatureDescription(featureKey);
            expect(description).toBeTruthy();
            expect(typeof description).toBe('string');
            expect(description.length).toBeGreaterThan(0);

            // Display name should be available
            const displayName = component.getFeatureDisplayName(featureKey);
            expect(displayName).toBeTruthy();
            expect(typeof displayName).toBe('string');
            expect(displayName.length).toBeGreaterThan(0);
          });

          // Test tooltip hiding functionality
          component.hideTooltip();
          expect(component.tooltipTimeout).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (Extended): Tooltip content consistency
   * For any feature, the tooltip content should be consistent and informative
   * Validates: Requirements 3.4
   */
  it.skip('should provide consistent and informative tooltip content for all features', () => {
    fc.assert(
      fc.property(fc.array(competitorArb, { minLength: 1, maxLength: 3 }), nexusShareArb, (competitors, nexusShare) => {
        // Arrange
        component.competitors = competitors;
        component.nexusShare = nexusShare;
        component.showTooltips = true;

        fixture.detectChanges();

        // Act & Assert
        component.featureDefinitions.forEach((feature) => {
          // Each feature should have a non-empty description
          const description = component.getFeatureDescription(feature.key);
          expect(description).toBe(feature.description);
          expect(description.length).toBeGreaterThan(10); // Meaningful description

          // Each feature should have a proper display name
          const displayName = component.getFeatureDisplayName(feature.key);
          expect(displayName).toBe(feature.displayName);
          expect(displayName.length).toBeGreaterThan(0);
          expect(displayName).not.toBe(feature.key); // Should be human-readable, not just the key

          // Display name should not contain underscores (should be formatted)
          expect(displayName).not.toContain('_');
        });
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (Extended): Tooltip accessibility
   * For any feature tooltip, proper accessibility attributes should be present
   * Validates: Requirements 3.4
   */
  it.skip('should maintain proper accessibility for all interactive tooltip elements', () => {
    fc.assert(
      fc.property(fc.array(competitorArb, { minLength: 1, maxLength: 4 }), nexusShareArb, (competitors, nexusShare) => {
        // Arrange
        component.competitors = competitors;
        component.nexusShare = nexusShare;
        component.showTooltips = true;

        fixture.detectChanges();

        // Act & Assert
        const tooltipTriggers = fixture.debugElement.queryAll(By.css('.tooltip-trigger'));

        tooltipTriggers.forEach((trigger, index) => {
          const triggerElement = trigger.nativeElement as HTMLButtonElement;
          const featureKey = component.featureDefinitions[index].key;
          const displayName = component.getFeatureDisplayName(featureKey);

          // Should have proper ARIA label
          const ariaLabel = triggerElement.getAttribute('aria-label');
          expect(ariaLabel).toBeTruthy();
          expect(ariaLabel).toContain('Learn more about');
          expect(ariaLabel).toContain(displayName);

          // Should be a button element for keyboard accessibility
          expect(triggerElement.tagName.toLowerCase()).toBe('button');
          expect(triggerElement.type).toBe('button');

          // Should be focusable
          expect(triggerElement.tabIndex).not.toBe(-1);

          // Should have visual indicator
          const tooltipIcon = trigger.query(By.css('.tooltip-icon'));
          expect(tooltipIcon).toBeTruthy();
          expect(tooltipIcon.nativeElement.getAttribute('aria-hidden')).toBe('true');
        });
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (Extended): Tooltip state management
   * For any tooltip interaction, the state should be managed correctly
   * Validates: Requirements 3.4
   */
  it.skip('should manage tooltip state correctly for all interaction patterns', () => {
    fc.assert(
      fc.property(
        fc.array(competitorArb, { minLength: 1, maxLength: 3 }),
        nexusShareArb,
        fc.array(fc.constantFrom(...component.featureDefinitions.map((f) => f.key)), { minLength: 1, maxLength: 5 }),
        (competitors, nexusShare, featureKeysToTest) => {
          // Arrange
          component.competitors = competitors;
          component.nexusShare = nexusShare;
          component.showTooltips = true;

          fixture.detectChanges();

          // Act & Assert
          featureKeysToTest.forEach((featureKey) => {
            // Initially no tooltip should be active
            expect(component.activeTooltip).toBeNull();

            // Show tooltip
            const mouseEvent = new MouseEvent('mouseenter');
            component.showTooltip(featureKey, mouseEvent);
            expect(component.activeTooltip).toBe(featureKey);

            // Keep tooltip visible should clear timeout
            component.keepTooltipVisible();
            const timeoutAfterKeep = component.tooltipTimeout;

            // Verify timeout was cleared
            expect(timeoutAfterKeep).toBeNull();

            // Hide tooltip should set timeout
            component.hideTooltip();
            expect(component.tooltipTimeout).toBeDefined();

            // Multiple show/hide cycles should work correctly
            component.showTooltip(featureKey, mouseEvent);
            expect(component.activeTooltip).toBe(featureKey);

            component.hideTooltip();
            expect(component.tooltipTimeout).toBeDefined();
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (Extended): No tooltips when disabled
   * For any configuration where tooltips are disabled, no interactive elements should be present
   * Validates: Requirements 3.4
   */
  it.skip('should not render interactive tooltip elements when tooltips are disabled', () => {
    fc.assert(
      fc.property(fc.array(competitorArb, { minLength: 1, maxLength: 4 }), nexusShareArb, (competitors, nexusShare) => {
        // Arrange
        component.competitors = competitors;
        component.nexusShare = nexusShare;
        component.showTooltips = false; // Disable tooltips

        fixture.detectChanges();

        // Act & Assert
        // No tooltip triggers should be rendered when tooltips are disabled
        const tooltipTriggers = fixture.debugElement.queryAll(By.css('.tooltip-trigger'));
        expect(tooltipTriggers.length).toBe(0);

        // No tooltip content should be rendered
        const tooltipContent = fixture.debugElement.queryAll(By.css('.tooltip-content'));
        expect(tooltipContent.length).toBe(0);

        // Feature names should still be displayed
        const featureNames = fixture.debugElement.queryAll(By.css('.feature-name'));
        expect(featureNames.length).toBe(component.featureDefinitions.length);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 4 (Extended): Feature definition completeness
   * For any feature in the system, complete definition data should be available
   * Validates: Requirements 3.4
   */
  it.skip('should have complete feature definitions for all supported features', () => {
    fc.assert(
      fc.property(fc.array(competitorArb, { minLength: 1, maxLength: 3 }), (competitors) => {
        // Arrange
        component.competitors = competitors;

        // Act & Assert
        // All feature keys from FeatureComparison should have definitions
        const featureKeys = Object.keys(competitors[0].features) as (keyof FeatureComparison)[];

        featureKeys.forEach((featureKey) => {
          const definition = component.featureDefinitions.find((def) => def.key === featureKey);

          // Each feature should have a definition
          expect(definition).toBeTruthy();

          if (definition) {
            // Definition should have all required properties
            expect(definition.key).toBe(featureKey);
            expect(definition.displayName).toBeTruthy();
            expect(definition.displayName.length).toBeGreaterThan(0);
            expect(definition.description).toBeTruthy();
            expect(definition.description.length).toBeGreaterThan(10);

            // Display name should be human-readable
            expect(definition.displayName).not.toContain('_');
            expect(definition.displayName).not.toBe(featureKey);
          }
        });

        // All definitions should correspond to actual feature keys
        component.featureDefinitions.forEach((definition) => {
          expect(featureKeys).toContain(definition.key);
        });
      }),
      { numRuns: 100 },
    );
  });
});

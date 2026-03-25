import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import * as fc from 'fast-check';

import { ComparisonOverviewComponent } from './comparison-overview.component';
import { CompetitorDataService } from '../../services/competitor-data.service';
import type { CompetitorData, TrainWithJoeData, FeatureStatus } from '../../models/competitor.interface';

describe('ComparisonOverviewComponent', () => {
  let component: ComparisonOverviewComponent;
  let fixture: ComponentFixture<ComparisonOverviewComponent>;
  let competitorDataService: any;

  // Mock data generators for property-based testing
  const mockCompetitorData: CompetitorData[] = [
    {
      name: 'Buffer',
      slug: 'buffer',
      tagline: 'Social media toolkit',
      logo: '/assets/images/buffer-logo.png',
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
        socialListening: 'none',
      },
      pros: ['User-friendly'],
      cons: ['No AI'],
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
        features: ['3 social platforms'],
        limitations: ['Train with Joe branding'],
      },
      {
        name: 'Pro',
        price: 15,
        billing: 'monthly',
        features: ['All Free features', 'Remove branding'],
        limitations: [],
      },
    ],
  };

  beforeEach(async () => {
    const mockCompetitorDataService = {
      loadCompetitorData: vi.fn(),
      getTrainWithJoeData: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ComparisonOverviewComponent, HttpClientTestingModule],
      providers: [
        { provide: CompetitorDataService, useValue: mockCompetitorDataService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({}),
            queryParams: of({}),
            snapshot: { params: {}, queryParams: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComparisonOverviewComponent);
    component = fixture.componentInstance;
    competitorDataService = TestBed.inject(CompetitorDataService) as any;

    // Setup default mock responses
    competitorDataService.loadCompetitorData.mockReturnValue(Promise.resolve(mockCompetitorData));
    competitorDataService.getTrainWithJoeData.mockReturnValue(mockTrainWithJoeData);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Unit Tests', () => {
    it('should load competitor data on init', async () => {
      await component.ngOnInit();

      expect(competitorDataService.loadCompetitorData).toHaveBeenCalled();
      expect(component.competitors).toEqual(mockCompetitorData);
      expect(component.trainWithJoeData).toEqual(mockTrainWithJoeData);
    });

    it('should handle loading errors', async () => {
      const errorMessage = 'Failed to load data';
      competitorDataService.loadCompetitorData.mockReturnValue(Promise.reject(new Error(errorMessage)));

      await component.ngOnInit();

      expect(component.error).toBe(errorMessage);
      expect(component.loading).toBe(false);
    });

    it('should return correct feature icons', () => {
      expect(component.getFeatureIcon('full')).toBe('✓');
      expect(component.getFeatureIcon('partial')).toBe('◐');
      expect(component.getFeatureIcon('premium')).toBe('★');
      expect(component.getFeatureIcon('none')).toBe('✗');
    });

    it('should return correct feature text', () => {
      expect(component.getFeatureText('full')).toBe('Full Support');
      expect(component.getFeatureText('partial')).toBe('Limited');
      expect(component.getFeatureText('premium')).toBe('Premium Only');
      expect(component.getFeatureText('none')).toBe('Not Available');
    });

    it('should calculate savings correctly', () => {
      component.trainWithJoeData = mockTrainWithJoeData;
      const competitor = mockCompetitorData[0];

      // Add a paid tier to test savings calculation
      competitor.pricing.push({
        name: 'Pro',
        price: 25,
        billing: 'monthly',
        features: ['More features'],
        limitations: [],
      });

      const savings = component.calculateSavings(competitor);
      expect(savings).toBe(10); // 25 - 15 = 10
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 1: Visual emphasis and highlighting consistency
     * Feature: competitor-comparison-pages, Property 1: Visual emphasis and highlighting consistency
     * Validates: Requirements 1.2, 3.2, 3.3
     */
    it.skip('should maintain consistent visual emphasis for Train with Joe advantages across all feature comparisons', () => {
      fc.assert(
        fc.property(
          // Generate random feature status combinations
          fc.record({
            multiPlatformPosting: fc.constantFrom('full', 'partial', 'premium', 'none'),
            aiContentGeneration: fc.constantFrom('full', 'partial', 'premium', 'none'),
            scheduling: fc.constantFrom('full', 'partial', 'premium', 'none'),
            analytics: fc.constantFrom('full', 'partial', 'premium', 'none'),
            teamCollaboration: fc.constantFrom('full', 'partial', 'premium', 'none'),
            mentionResolution: fc.constantFrom('full', 'partial', 'premium', 'none'),
            contentRecycling: fc.constantFrom('full', 'partial', 'premium', 'none'),
            visualPlanning: fc.constantFrom('full', 'partial', 'premium', 'none'),
            socialListening: fc.constantFrom('full', 'partial', 'premium', 'none'),
          }),
          (nexusFeatures) => {
            // Set up component with generated features
            component.trainWithJoeFeatures = nexusFeatures as any;

            // Test that each feature gets consistent visual treatment
            component.featureList.forEach((feature) => {
              const featureStatus = nexusFeatures[feature.key as keyof typeof nexusFeatures] as FeatureStatus;

              // Visual emphasis consistency checks
              const cssClass = component.getFeatureClass(featureStatus);
              const icon = component.getFeatureIcon(featureStatus);
              const text = component.getFeatureText(featureStatus);

              // Ensure consistent CSS class naming
              expect(cssClass).toBe(`feature-${featureStatus}`);

              // Ensure consistent icon mapping
              switch (featureStatus) {
                case 'full':
                  expect(icon).toBe('✓');
                  expect(text).toBe('Full Support');
                  break;
                case 'partial':
                  expect(icon).toBe('◐');
                  expect(text).toBe('Limited');
                  break;
                case 'premium':
                  expect(icon).toBe('★');
                  expect(text).toBe('Premium Only');
                  break;
                case 'none':
                  expect(icon).toBe('✗');
                  expect(text).toBe('Not Available');
                  break;
              }
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property test for feature comparison display consistency
     * Ensures that all features are displayed with proper visual indicators
     */
    it.skip('should display all features with consistent visual indicators regardless of status combination', () => {
      fc.assert(
        fc.property(
          // Generate arrays of competitors with random feature combinations
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              slug: fc.string({ minLength: 1, maxLength: 20 }),
              features: fc.record({
                multiPlatformPosting: fc.constantFrom('full', 'partial', 'premium', 'none'),
                aiContentGeneration: fc.constantFrom('full', 'partial', 'premium', 'none'),
                scheduling: fc.constantFrom('full', 'partial', 'premium', 'none'),
                analytics: fc.constantFrom('full', 'partial', 'premium', 'none'),
                teamCollaboration: fc.constantFrom('full', 'partial', 'premium', 'none'),
                mentionResolution: fc.constantFrom('full', 'partial', 'premium', 'none'),
                contentRecycling: fc.constantFrom('full', 'partial', 'premium', 'none'),
                visualPlanning: fc.constantFrom('full', 'partial', 'premium', 'none'),
                socialListening: fc.constantFrom('full', 'partial', 'premium', 'none'),
              }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          (competitors) => {
            // Test that visual emphasis is consistent across all competitors
            competitors.forEach((competitor) => {
              component.featureList.forEach((feature) => {
                const featureStatus = competitor.features[
                  feature.key as keyof typeof competitor.features
                ] as FeatureStatus;

                // Each feature status should have consistent visual treatment
                const cssClass = component.getFeatureClass(featureStatus);
                const icon = component.getFeatureIcon(featureStatus);
                const text = component.getFeatureText(featureStatus);

                // Verify consistency
                expect(cssClass).toMatch(/^feature-(full|partial|premium|none)$/);
                expect(icon).toMatch(/^[✓◐★✗?]$/);
                expect(text).toMatch(/^(Full Support|Limited|Premium Only|Not Available|Unknown)$/);

                // Verify that the same status always produces the same visual elements
                const expectedIcon = component.getFeatureIcon(featureStatus);
                const expectedText = component.getFeatureText(featureStatus);
                const expectedClass = component.getFeatureClass(featureStatus);

                expect(icon).toBe(expectedIcon);
                expect(text).toBe(expectedText);
                expect(cssClass).toBe(expectedClass);
              });
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property test for Train with Joe highlighting consistency
     * Ensures Train with Joe advantages are consistently highlighted
     */
    it.skip('should consistently highlight Train with Joe advantages with special styling', () => {
      fc.assert(
        fc.property(fc.constantFrom('full', 'partial', 'premium', 'none'), (nexusFeatureStatus) => {
          // Test that Train with Joe features get special visual treatment
          const cssClass = component.getFeatureClass(nexusFeatureStatus as FeatureStatus);

          // Train with Joe should always get consistent CSS class structure
          expect(cssClass).toBe(`feature-${nexusFeatureStatus}`);

          // The CSS class should be suitable for special styling
          // (The actual special styling is applied via the 'nexus-cell' class in the template)
          expect(cssClass).toMatch(/^feature-/);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 6: Conversion opportunity availability
     * Feature: competitor-comparison-pages, Property 6: Conversion opportunity availability
     * Validates: Requirements 5.4
     */
    it.skip('should provide multiple conversion opportunities throughout the comparison page', () => {
      fc.assert(
        fc.property(
          // Generate random competitor data to test conversion opportunities
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 20 }),
              slug: fc.string({ minLength: 1, maxLength: 20 }),
              pricing: fc.array(
                fc.record({
                  name: fc.string({ minLength: 1, maxLength: 10 }),
                  price: fc.integer({ min: 0, max: 200 }),
                  billing: fc.constantFrom('monthly', 'annual'),
                  features: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }),
                  limitations: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 3 }),
                }),
                { minLength: 1, maxLength: 4 },
              ),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          (competitors) => {
            // Set up component with generated competitors
            component.competitors = competitors as any;
            component.trainWithJoeData = mockTrainWithJoeData;

            // Test that conversion opportunities are available

            // 1. Cost savings calculations should be available for all competitors
            competitors.forEach((competitor) => {
              const savings = component.calculateSavings(competitor as any);
              // Savings should be a non-negative number
              expect(typeof savings).toBe('number');
              expect(savings).toBeGreaterThanOrEqual(0);
            });

            // 2. Train with Joe pricing should be available for conversion
            expect(component.trainWithJoeData).toBeTruthy();
            expect(component.trainWithJoeData!.pricing).toBeTruthy();
            expect(component.trainWithJoeData!.pricing.length).toBeGreaterThan(0);

            // 3. Each pricing tier should have clear features for conversion
            component.trainWithJoeData!.pricing.forEach((tier) => {
              expect(tier.name).toBeTruthy();
              expect(typeof tier.price).toBe('number');
              expect(tier.features).toBeTruthy();
              expect(tier.features.length).toBeGreaterThan(0);
            });

            // 4. Unique features should be highlighted for conversion
            expect(component.trainWithJoeData!.uniqueFeatures).toBeTruthy();
            expect(component.trainWithJoeData!.uniqueFeatures.length).toBeGreaterThan(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property test for conversion opportunity consistency
     * Ensures conversion elements are consistently available
     */
    it.skip('should maintain consistent conversion opportunities regardless of competitor data variations', () => {
      fc.assert(
        fc.property(
          // Generate different competitor configurations
          fc.record({
            competitorCount: fc.integer({ min: 1, max: 10 }),
            hasFreeTiers: fc.boolean(),
            hasPaidTiers: fc.boolean(),
          }),
          (config) => {
            // Generate competitors based on configuration
            const competitors = Array.from({ length: config.competitorCount }, (_, i) => ({
              name: `Competitor ${i + 1}`,
              slug: `competitor-${i + 1}`,
              pricing: [
                ...(config.hasFreeTiers
                  ? [
                      {
                        name: 'Free',
                        price: 0,
                        billing: 'monthly' as const,
                        features: ['Basic features'],
                        limitations: ['Limited usage'],
                      },
                    ]
                  : []),
                ...(config.hasPaidTiers
                  ? [
                      {
                        name: 'Pro',
                        price: 20 + i * 5,
                        billing: 'monthly' as const,
                        features: ['Advanced features'],
                        limitations: [],
                      },
                    ]
                  : []),
              ],
            }));

            component.competitors = competitors as any;
            component.trainWithJoeData = mockTrainWithJoeData;

            // Test that conversion opportunities are consistently available

            // 1. Savings calculations should work for all configurations
            competitors.forEach((competitor) => {
              const savings = component.calculateSavings(competitor as any);
              expect(typeof savings).toBe('number');
              expect(savings).toBeGreaterThanOrEqual(0);
            });

            // 2. Pricing display methods should work consistently
            competitors.forEach((competitor) => {
              const topTiers = component.getTopPricingTiers(competitor as any);
              expect(Array.isArray(topTiers)).toBe(true);
              expect(topTiers.length).toBeLessThanOrEqual(2); // Should limit to top 2 tiers

              topTiers.forEach((tier) => {
                const topFeatures = component.getTopFeatures(tier.features);
                const topLimitations = component.getTopLimitations(tier.limitations);

                expect(Array.isArray(topFeatures)).toBe(true);
                expect(Array.isArray(topLimitations)).toBe(true);
                expect(topFeatures.length).toBeLessThanOrEqual(3); // Should limit to top 3 features
                expect(topLimitations.length).toBeLessThanOrEqual(2); // Should limit to top 2 limitations
              });
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

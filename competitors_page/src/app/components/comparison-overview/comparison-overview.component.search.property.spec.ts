import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import * as fc from 'fast-check';

import { ComparisonOverviewComponent } from './comparison-overview.component';
import { CompetitorDataService } from '../../services/competitor-data.service';
import { OGMetaService } from '../../services/og-meta.service';
import type { CompetitorData, NexusShareData } from '../../models/competitor.interface';

describe('ComparisonOverviewComponent - Search and Filter Property Tests', () => {
  let component: ComparisonOverviewComponent;
  let fixture: ComponentFixture<ComparisonOverviewComponent>;
  let mockCompetitorDataService: jasmine.SpyObj<CompetitorDataService>;

  const mockCompetitors: CompetitorData[] = [
    {
      name: 'Buffer',
      slug: 'buffer',
      tagline: 'Social media toolkit for small businesses',
      logo: '/assets/images/competitors/buffer-logo.png',
      website: 'https://buffer.com',
      pricing: [
        { name: 'Free', price: 0, billing: 'monthly', features: ['3 channels'], limitations: ['Limited analytics'] },
        { name: 'Pro', price: 15, billing: 'monthly', features: ['8 channels'], limitations: [] },
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
      pros: ['User-friendly interface', 'Reliable scheduling'],
      cons: ['No AI content generation', 'Limited free plan'],
      targetAudience: 'Small businesses',
      lastUpdated: '2024-12-30',
    },
    {
      name: 'Hootsuite',
      slug: 'hootsuite',
      tagline: 'Enterprise social media management',
      logo: '/assets/images/competitors/hootsuite-logo.png',
      website: 'https://hootsuite.com',
      pricing: [
        { name: 'Professional', price: 49, billing: 'monthly', features: ['10 channels'], limitations: ['1 user'] },
        { name: 'Team', price: 129, billing: 'monthly', features: ['20 channels'], limitations: [] },
      ],
      features: {
        multiPlatformPosting: 'full',
        aiContentGeneration: 'partial',
        scheduling: 'full',
        analytics: 'full',
        teamCollaboration: 'full',
        mentionResolution: 'partial',
        contentRecycling: 'partial',
        visualPlanning: 'full',
        socialListening: 'full',
      },
      pros: ['Comprehensive analytics', 'Team collaboration'],
      cons: ['Expensive pricing', 'Complex interface'],
      targetAudience: 'Enterprise teams',
      lastUpdated: '2024-12-30',
    },
  ];

  const mockNexusShareData: NexusShareData = {
    pricing: [
      { name: 'Free', price: 0, billing: 'monthly', features: ['3 platforms'], limitations: ['Nexus Share branding'] },
      { name: 'Pro', price: 15, billing: 'monthly', features: ['Unlimited platforms'], limitations: [] },
    ],
    uniqueFeatures: [
      'AI-powered content enhancement',
      'Advanced mention resolution',
      'Free tier with full feature access',
    ],
  };

  beforeEach(async () => {
    const competitorDataServiceSpy = jasmine.createSpyObj('CompetitorDataService', [
      'loadCompetitorData',
      'getNexusShareData',
    ]);
    const ogMetaServiceSpy = jasmine.createSpyObj('OGMetaService', ['updateComparisonOverviewMeta']);

    await TestBed.configureTestingModule({
      imports: [ComparisonOverviewComponent, RouterTestingModule, FormsModule],
      providers: [
        { provide: CompetitorDataService, useValue: competitorDataServiceSpy },
        { provide: OGMetaService, useValue: ogMetaServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComparisonOverviewComponent);
    component = fixture.componentInstance;
    mockCompetitorDataService = TestBed.inject(CompetitorDataService) as jasmine.SpyObj<CompetitorDataService>;
    mockOGMetaService = TestBed.inject(OGMetaService) as jasmine.SpyObj<OGMetaService>;

    mockCompetitorDataService.loadCompetitorData.and.returnValue(Promise.resolve(mockCompetitors));
    mockCompetitorDataService.getNexusShareData.and.returnValue(mockNexusShareData);
  });

  /**
   * Property 13: Search and filter functionality
   * For any search query and filter combination, the filtered results should only include
   * competitors that match the search criteria and filter conditions
   * **Validates: Requirements 8.4**
   */
  it.skip('Property 13: Search and filter functionality - should filter competitors correctly for any search term', async () => {
    // Setup component with mock data first
    await component.ngOnInit();
    await fixture.whenStable();

    fc.assert(
      fc.property(fc.string({ minLength: 0, maxLength: 50 }), (searchTerm) => {
        // Apply search term
        component.searchTerm = searchTerm;
        component.onSearchChange();

        // Verify filtering logic
        const filteredCompetitors = component.filteredCompetitors;

        if (searchTerm.trim() === '') {
          // Empty search should return all competitors
          expect(filteredCompetitors.length).toBe(mockCompetitors.length);
        } else {
          // Non-empty search should only return matching competitors
          const searchLower = searchTerm.toLowerCase().trim();

          filteredCompetitors.forEach((competitor) => {
            const matchesName = competitor.name.toLowerCase().includes(searchLower);
            const matchesTagline = competitor.tagline.toLowerCase().includes(searchLower);
            const matchesAudience = competitor.targetAudience.toLowerCase().includes(searchLower);
            const matchesPros = competitor.pros.some((pro) => pro.toLowerCase().includes(searchLower));
            const matchesFeatures = component.featureList.some((feature) => {
              const featureStatus = competitor.features[feature.key];
              return (
                feature.displayName.toLowerCase().includes(searchLower) ||
                (featureStatus === 'full' && searchLower.includes('full')) ||
                (featureStatus === 'partial' && searchLower.includes('partial')) ||
                (featureStatus === 'premium' && searchLower.includes('premium'))
              );
            });

            const shouldMatch = matchesName || matchesTagline || matchesAudience || matchesPros || matchesFeatures;
            expect(shouldMatch).toBe(
              true,
              `Competitor ${competitor.name} should match search term "${searchTerm}" but doesn't`,
            );
          });
        }
      }),
      { numRuns: 100 },
    );
  });

  it.skip('Property 13: Price range filter functionality - should filter competitors by price range correctly', async () => {
    // Setup component with mock data first
    await component.ngOnInit();
    await fixture.whenStable();

    fc.assert(
      fc.property(fc.constantFrom('all', 'free', 'under-10', '10-25', 'over-25'), (priceRange) => {
        // Apply price range filter
        component.selectedPriceRange = priceRange;
        component.onPriceRangeChange();

        // Verify filtering logic
        const filteredCompetitors = component.filteredCompetitors;

        if (priceRange === 'all') {
          expect(filteredCompetitors.length).toBe(mockCompetitors.length);
        } else {
          filteredCompetitors.forEach((competitor) => {
            const prices = competitor.pricing.map((tier) => tier.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices.filter((p) => p > 0));

            let shouldMatch = false;
            switch (priceRange) {
              case 'free':
                shouldMatch = prices.includes(0);
                break;
              case 'under-10':
                shouldMatch = maxPrice < 10;
                break;
              case '10-25':
                shouldMatch = minPrice <= 25 && maxPrice >= 10;
                break;
              case 'over-25':
                shouldMatch = minPrice > 25;
                break;
            }

            expect(shouldMatch).toBe(
              true,
              `Competitor ${competitor.name} should match price range "${priceRange}" but doesn't`,
            );
          });
        }
      }),
      { numRuns: 100 },
    );
  });

  it.skip('Property 13: Feature category filter functionality - should filter competitors by feature category correctly', async () => {
    // Setup component with mock data first
    await component.ngOnInit();
    await fixture.whenStable();

    fc.assert(
      fc.property(
        fc.constantFrom('all', 'content', 'scheduling', 'analytics', 'collaboration', 'ai'),
        (featureCategory) => {
          // Apply feature category filter
          component.selectedFeatureCategory = featureCategory;
          component.onFeatureCategoryChange();

          // Verify filtering logic
          const filteredCompetitors = component.filteredCompetitors;

          if (featureCategory === 'all') {
            expect(filteredCompetitors.length).toBe(mockCompetitors.length);
          } else {
            filteredCompetitors.forEach((competitor) => {
              const features = competitor.features;
              let shouldMatch = false;

              switch (featureCategory) {
                case 'content':
                  shouldMatch =
                    features.aiContentGeneration === 'full' ||
                    features.contentRecycling === 'full' ||
                    features.visualPlanning === 'full';
                  break;
                case 'scheduling':
                  shouldMatch = features.scheduling === 'full' || features.multiPlatformPosting === 'full';
                  break;
                case 'analytics':
                  shouldMatch = features.analytics === 'full' || features.socialListening === 'full';
                  break;
                case 'collaboration':
                  shouldMatch = features.teamCollaboration === 'full' || features.teamCollaboration === 'premium';
                  break;
                case 'ai':
                  shouldMatch = features.aiContentGeneration === 'full' || features.aiContentGeneration === 'partial';
                  break;
              }

              expect(shouldMatch).toBe(
                true,
                `Competitor ${competitor.name} should match feature category "${featureCategory}" but doesn't`,
              );
            });
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it.skip('Property 13: Combined search and filter functionality - should apply both search and filters correctly', async () => {
    // Setup component with mock data first
    await component.ngOnInit();
    await fixture.whenStable();

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 20 }),
        fc.constantFrom('all', 'free', 'under-10', '10-25', 'over-25'),
        fc.constantFrom('all', 'content', 'scheduling', 'analytics', 'collaboration', 'ai'),
        (searchTerm, priceRange, featureCategory) => {
          // Apply all filters
          component.searchTerm = searchTerm;
          component.selectedPriceRange = priceRange;
          component.selectedFeatureCategory = featureCategory;
          component.applyFilters();

          // Verify that filtered results satisfy all conditions
          const filteredCompetitors = component.filteredCompetitors;

          // Each filtered competitor should match all applied filters
          filteredCompetitors.forEach((competitor) => {
            // Check search term match (if not empty)
            if (searchTerm.trim() !== '') {
              const searchLower = searchTerm.toLowerCase().trim();
              const matchesSearch =
                competitor.name.toLowerCase().includes(searchLower) ||
                competitor.tagline.toLowerCase().includes(searchLower) ||
                competitor.targetAudience.toLowerCase().includes(searchLower) ||
                competitor.pros.some((pro) => pro.toLowerCase().includes(searchLower));

              expect(matchesSearch).toBe(true, `Competitor ${competitor.name} should match search "${searchTerm}"`);
            }

            // Check price range match (if not 'all')
            if (priceRange !== 'all') {
              const prices = competitor.pricing.map((tier) => tier.price);
              const minPrice = Math.min(...prices);
              const maxPrice = Math.max(...prices.filter((p) => p > 0));

              let matchesPrice = false;
              switch (priceRange) {
                case 'free':
                  matchesPrice = prices.includes(0);
                  break;
                case 'under-10':
                  matchesPrice = maxPrice < 10;
                  break;
                case '10-25':
                  matchesPrice = minPrice <= 25 && maxPrice >= 10;
                  break;
                case 'over-25':
                  matchesPrice = minPrice > 25;
                  break;
              }

              expect(matchesPrice).toBe(true, `Competitor ${competitor.name} should match price range "${priceRange}"`);
            }

            // Check feature category match (if not 'all')
            if (featureCategory !== 'all') {
              const features = competitor.features;
              let matchesFeature = false;

              switch (featureCategory) {
                case 'content':
                  matchesFeature =
                    features.aiContentGeneration === 'full' ||
                    features.contentRecycling === 'full' ||
                    features.visualPlanning === 'full';
                  break;
                case 'scheduling':
                  matchesFeature = features.scheduling === 'full' || features.multiPlatformPosting === 'full';
                  break;
                case 'analytics':
                  matchesFeature = features.analytics === 'full' || features.socialListening === 'full';
                  break;
                case 'collaboration':
                  matchesFeature = features.teamCollaboration === 'full' || features.teamCollaboration === 'premium';
                  break;
                case 'ai':
                  matchesFeature =
                    features.aiContentGeneration === 'full' || features.aiContentGeneration === 'partial';
                  break;
              }

              expect(matchesFeature).toBe(
                true,
                `Competitor ${competitor.name} should match feature category "${featureCategory}"`,
              );
            }
          });

          // Verify that filter counts are consistent
          expect(component.getFilteredCompetitorsCount()).toBe(filteredCompetitors.length);
          expect(component.getTotalCompetitorsCount()).toBe(mockCompetitors.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

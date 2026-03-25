import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CompetitorDataService } from './competitor-data.service';
import type { CompetitorData } from '../models/competitor.interface';
import * as fc from 'fast-check';

/**
 * Property-based tests for data freshness transparency
 * Feature: competitor-comparison-pages, Property 9: Data freshness transparency
 * Validates: Requirements 6.4
 */
describe('CompetitorDataService - Data Freshness Transparency Properties', () => {
  let service: CompetitorDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CompetitorDataService],
    });
    service = TestBed.inject(CompetitorDataService);
  });

  /**
   * Property 9: Data freshness transparency
   * For any competitor information that is older than 30 days, appropriate disclaimers
   * about data freshness should be displayed to users
   */
  it.skip('should provide appropriate disclaimers for outdated competitor data', () => {
    fc.assert(
      fc.property(
        // Generate competitor data with various ages
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          slug: fc.string({ minLength: 1, maxLength: 30 }).map((s) => s.toLowerCase().replace(/[^a-z0-9]/g, '-')),
          tagline: fc.string({ minLength: 1, maxLength: 100 }),
          logo: fc.constant('/test-logo.png'),
          website: fc.constant('https://test.com'),
          pricing: fc.constant([]),
          features: fc.constant({
            multiPlatformPosting: 'full' as const,
            aiContentGeneration: 'none' as const,
            scheduling: 'full' as const,
            analytics: 'partial' as const,
            teamCollaboration: 'premium' as const,
            mentionResolution: 'none' as const,
            contentRecycling: 'none' as const,
            visualPlanning: 'partial' as const,
            socialListening: 'none' as const,
          }),
          pros: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          cons: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          targetAudience: fc.string({ minLength: 1, maxLength: 100 }),
          // Generate dates from 0 to 365 days ago
          daysAgo: fc.integer({ min: 0, max: 365 }),
        }),
        (competitorData) => {
          // Create date based on days ago
          const lastUpdated = new Date();
          lastUpdated.setDate(lastUpdated.getDate() - competitorData.daysAgo);

          const competitor: CompetitorData = {
            ...competitorData,
            lastUpdated: lastUpdated.toISOString().split('T')[0], // Format as YYYY-MM-DD
          };

          const freshnessStatus = service.getDataFreshnessStatus(competitor);

          // Property: Data older than 30 days should have disclaimers
          if (competitorData.daysAgo > 30) {
            // Should be marked as outdated
            expect(freshnessStatus.isOutdated).toBe(true);

            // Should have a non-empty disclaimer
            expect(freshnessStatus.disclaimer).toBeTruthy();
            expect(freshnessStatus.disclaimer.length).toBeGreaterThan(0);

            // Disclaimer should mention the age or outdated nature
            const disclaimerLower = freshnessStatus.disclaimer.toLowerCase();
            const hasAgeReference =
              disclaimerLower.includes('days') ||
              disclaimerLower.includes('old') ||
              disclaimerLower.includes('outdated') ||
              disclaimerLower.includes('changed') ||
              disclaimerLower.includes('verify');
            expect(hasAgeReference).toBe(true);

            // Freshness level should be outdated or stale
            expect(['outdated', 'stale']).toContain(freshnessStatus.freshnessLevel);
          } else {
            // Data 30 days or newer should not be marked as outdated
            expect(freshnessStatus.isOutdated).toBe(false);

            // Fresh data (≤7 days) should have no disclaimer
            if (competitorData.daysAgo <= 7) {
              expect(freshnessStatus.disclaimer).toBe('');
              expect(freshnessStatus.freshnessLevel).toBe('fresh');
            }

            // Moderate data (8-30 days) may have a disclaimer but should be less severe
            if (competitorData.daysAgo > 7 && competitorData.daysAgo <= 30) {
              expect(freshnessStatus.freshnessLevel).toBe('moderate');
              // If there's a disclaimer, it should be less severe than outdated data
              if (freshnessStatus.disclaimer) {
                const disclaimerLower = freshnessStatus.disclaimer.toLowerCase();
                expect(disclaimerLower.includes('significantly')).toBe(false);
              }
            }
          }

          // Days since update should match the generated age (within 1 day tolerance for date precision)
          expect(Math.abs(freshnessStatus.daysSinceUpdate - competitorData.daysAgo)).toBeLessThanOrEqual(1);

          // Last updated date should be reasonably close to expected date (within 24 hours)
          const expectedTime = lastUpdated.getTime();
          const actualTime = freshnessStatus.lastUpdated.getTime();
          const timeDifference = Math.abs(expectedTime - actualTime);
          const oneDayInMs = 24 * 60 * 60 * 1000;
          expect(timeDifference).toBeLessThanOrEqual(oneDayInMs);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Freshness levels should be consistently categorized
   */
  it.skip('should consistently categorize data freshness levels', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 730 }), // Up to 2 years
        (daysAgo) => {
          const lastUpdated = new Date();
          lastUpdated.setDate(lastUpdated.getDate() - daysAgo);

          const competitor: CompetitorData = {
            name: 'Test Competitor',
            slug: 'test-competitor',
            tagline: 'Test tagline',
            logo: '/test-logo.png',
            website: 'https://test.com',
            pricing: [],
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
            pros: ['Test pro'],
            cons: ['Test con'],
            targetAudience: 'Test audience',
            lastUpdated: lastUpdated.toISOString().split('T')[0],
          };

          const freshnessStatus = service.getDataFreshnessStatus(competitor);

          // Verify consistent categorization
          if (daysAgo <= 7) {
            expect(freshnessStatus.freshnessLevel).toBe('fresh');
            expect(freshnessStatus.disclaimer).toBe('');
          } else if (daysAgo <= 30) {
            expect(freshnessStatus.freshnessLevel).toBe('moderate');
            expect(freshnessStatus.disclaimer).toContain('days ago');
          } else if (daysAgo <= 90) {
            expect(freshnessStatus.freshnessLevel).toBe('outdated');
            expect(freshnessStatus.disclaimer).toContain('days old');
            expect(freshnessStatus.disclaimer.toLowerCase()).toContain('significantly');
          } else {
            expect(freshnessStatus.freshnessLevel).toBe('stale');
            expect(freshnessStatus.disclaimer).toContain('days old');
            expect(freshnessStatus.disclaimer.toLowerCase()).toContain('significantly outdated');
          }

          // Outdated flag should be consistent
          expect(freshnessStatus.isOutdated).toBe(daysAgo > 30);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Overall freshness summary should be mathematically consistent
   */
  it.skip('should provide mathematically consistent overall freshness summaries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 20 }),
            daysAgo: fc.integer({ min: 0, max: 365 }),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (competitorDataList) => {
          // Create competitor data with various ages
          const competitors: CompetitorData[] = competitorDataList.map((data, index) => {
            const lastUpdated = new Date();
            lastUpdated.setDate(lastUpdated.getDate() - data.daysAgo);

            return {
              name: data.name,
              slug: `competitor-${index}`,
              tagline: 'Test tagline',
              logo: '/test-logo.png',
              website: 'https://test.com',
              pricing: [],
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
              pros: ['Test pro'],
              cons: ['Test con'],
              targetAudience: 'Test audience',
              lastUpdated: lastUpdated.toISOString().split('T')[0],
            };
          });

          // Create a fresh service instance to avoid spy conflicts
          const freshService = new CompetitorDataService(null as any);

          // Directly set the competitors data using the private subject
          (freshService as any).competitorsSubject.next(competitors);

          const summary = freshService.getOverallDataFreshness();

          // Verify mathematical consistency
          expect(summary.totalCompetitors).toBe(competitors.length);

          // Count categories manually
          let expectedFresh = 0;
          let expectedModerate = 0;
          let expectedOutdated = 0;
          let expectedStale = 0;
          let totalDays = 0;
          let oldestAge = 0;
          let newestAge = Infinity;

          competitorDataList.forEach((data) => {
            const age = data.daysAgo;
            totalDays += age;
            oldestAge = Math.max(oldestAge, age);
            newestAge = Math.min(newestAge, age);

            if (age <= 7) expectedFresh++;
            else if (age <= 30) expectedModerate++;
            else if (age <= 90) expectedOutdated++;
            else expectedStale++;
          });

          expect(summary.freshCount).toBe(expectedFresh);
          expect(summary.moderateCount).toBe(expectedModerate);
          expect(summary.outdatedCount).toBe(expectedOutdated);
          expect(summary.staleCount).toBe(expectedStale);

          // Total should add up
          expect(summary.freshCount + summary.moderateCount + summary.outdatedCount + summary.staleCount).toBe(
            summary.totalCompetitors,
          );

          // Age calculations should be correct
          expect(summary.averageDataAge).toBe(Math.round(totalDays / competitors.length));
          expect(summary.oldestDataAge).toBe(oldestAge);
          expect(summary.newestDataAge).toBe(newestAge === Infinity ? 0 : newestAge);
          expect(summary.needsUpdateCount).toBe(expectedOutdated + expectedStale);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property: Timestamp validation should be consistent and secure
   */
  it.skip('should consistently validate timestamps and reject invalid dates', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          // Valid date strings
          fc.date({ min: new Date('2020-01-01'), max: new Date() }).map((d) => d.toISOString().split('T')[0]),
          // Invalid date strings
          fc.string({ minLength: 1, maxLength: 20 }),
          // Future dates (should be invalid)
          fc
            .date({ min: new Date(Date.now() + 86400000), max: new Date(Date.now() + 365 * 86400000) })
            .map((d) => d.toISOString().split('T')[0]),
          // Very old dates (should be invalid)
          fc
            .date({ min: new Date('1990-01-01'), max: new Date('2020-01-01') })
            .map((d) => d.toISOString().split('T')[0]),
        ),
        fc.string({ minLength: 1, maxLength: 30 }),
        (timestamp, competitorName) => {
          const validation = service.validateTimestamp(timestamp, competitorName);

          if (validation.isValid) {
            // Valid timestamps should have a parsed date
            expect(validation.parsedDate).toBeDefined();
            expect(validation.parsedDate).toBeInstanceOf(Date);
            expect(validation.error).toBeUndefined();

            // Valid date should not be in the future
            expect(validation.parsedDate!.getTime()).toBeLessThanOrEqual(Date.now());

            // Valid date should not be too old (more than 2 years)
            const twoYearsAgo = new Date();
            twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
            expect(validation.parsedDate!.getTime()).toBeGreaterThanOrEqual(twoYearsAgo.getTime());
          } else {
            // Invalid timestamps should have an error message
            expect(validation.error).toBeDefined();
            expect(validation.error!.length).toBeGreaterThan(0);
            expect(validation.error!).toContain(competitorName);
            expect(validation.parsedDate).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

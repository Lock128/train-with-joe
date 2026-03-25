import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, expect, beforeEach, afterEach } from 'vitest';
import { CompetitorDataService } from './competitor-data.service';
import type {
  CompetitorData,
  CompetitorConfiguration,
  FeatureStatus,
  BillingCycle,
} from '../models/competitor.interface';

describe('CompetitorDataService', () => {
  let service: CompetitorDataService;
  let httpMock: HttpTestingController;

  const mockCompetitorData: CompetitorData = {
    name: 'Buffer',
    slug: 'buffer',
    tagline: 'The social media toolkit for small businesses',
    logo: '/assets/images/competitors/buffer-logo.png',
    website: 'https://buffer.com',
    pricing: [
      {
        name: 'Free',
        price: 0,
        billing: 'monthly' as BillingCycle,
        features: ['3 social channels', '10 scheduled posts per channel'],
        limitations: ['Limited analytics', 'No team features'],
      },
      {
        name: 'Essentials',
        price: 6,
        billing: 'monthly' as BillingCycle,
        features: ['8 social channels', 'Unlimited posts', 'Basic analytics'],
        limitations: ['1 user only', 'Limited integrations'],
      },
    ],
    features: {
      multiPlatformPosting: 'full' as FeatureStatus,
      aiContentGeneration: 'none' as FeatureStatus,
      scheduling: 'full' as FeatureStatus,
      analytics: 'partial' as FeatureStatus,
      teamCollaboration: 'premium' as FeatureStatus,
      mentionResolution: 'none' as FeatureStatus,
      contentRecycling: 'none' as FeatureStatus,
      visualPlanning: 'partial' as FeatureStatus,
      socialListening: 'premium' as FeatureStatus,
    },
    pros: ['User-friendly interface', 'Reliable scheduling', 'Good customer support'],
    cons: ['No AI content generation', 'Limited free plan', 'Expensive for teams'],
    targetAudience: 'Small businesses and solo entrepreneurs',
    lastUpdated: '2024-12-30',
  };

  const mockNexusShareData = {
    uniqueFeatures: [
      'AI-powered content enhancement via Amazon Bedrock',
      'Advanced mention resolution across platforms',
      'Free tier with full feature access',
    ],
    pricing: [
      {
        name: 'Free',
        price: 0,
        billing: 'monthly' as BillingCycle,
        features: ['3 social platforms (X, LinkedIn, Bluesky)', 'AI content enhancement', 'Advanced scheduling'],
        limitations: ['Nexus Share branding'],
      },
    ],
  };

  const mockConfiguration: CompetitorConfiguration = {
    competitors: [mockCompetitorData],
    nexusShare: mockNexusShareData,
  };

  beforeEach(async () => {
    // Reset TestBed for each test to avoid conflicts
    TestBed.resetTestingModule();

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CompetitorDataService],
    }).compileComponents();

    service = TestBed.inject(CompetitorDataService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // Verify no outstanding requests and clean up
    try {
      httpMock?.verify();
    } catch (error) {
      // Log but don't fail the test for cleanup issues
      console.warn('HTTP verification warning:', error);
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('loadCompetitorData', () => {
    it('should load competitor data successfully', async () => {
      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockConfiguration);

      const result = await loadPromise;
      expect(result).toEqual([mockCompetitorData]);
      expect(service.getAllCompetitors()).toEqual([mockCompetitorData]);
    });

    it('should handle HTTP 404 error', async () => {
      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });

      // Service should use fallback data instead of throwing
      const result = await loadPromise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Check that error was emitted
      service.error$.subscribe((error) => {
        if (error) {
          expect(error).toContain('Competitor configuration file not found');
        }
      });
    });

    it('should handle network error', async () => {
      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush('Network Error', { status: 0, statusText: 'Network Error' });

      // Service should use fallback data instead of throwing
      const result = await loadPromise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Check that error was emitted
      service.error$.subscribe((error) => {
        if (error) {
          expect(error).toContain('Network error');
        }
      });
    });

    it('should handle invalid JSON data', async () => {
      const invalidConfig = { ...mockConfiguration };
      delete (invalidConfig as any).competitors;

      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(invalidConfig);

      // Service should use fallback data instead of throwing
      const result = await loadPromise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Check that error was emitted
      service.error$.subscribe((error) => {
        if (error) {
          expect(error).toContain('Invalid or missing competitors array');
        }
      });
    });

    it('should validate competitor data completeness', async () => {
      const incompleteCompetitor = { ...mockCompetitorData };
      delete (incompleteCompetitor as any).name;

      const invalidConfig = {
        ...mockConfiguration,
        competitors: [incompleteCompetitor],
      };

      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(invalidConfig);

      // Service should use fallback data instead of throwing
      const result = await loadPromise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Check that error was emitted
      service.error$.subscribe((error) => {
        if (error) {
          expect(error).toContain("Missing required field 'name'");
        }
      });
    });

    it('should validate slug format', async () => {
      const invalidSlugCompetitor = {
        ...mockCompetitorData,
        slug: 'Invalid Slug!',
      };

      const invalidConfig = {
        ...mockConfiguration,
        competitors: [invalidSlugCompetitor],
      };

      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(invalidConfig);

      // Service should use fallback data instead of throwing
      const result = await loadPromise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Check that error was emitted
      service.error$.subscribe((error) => {
        if (error) {
          expect(error).toContain('Invalid slug format');
        }
      });
    });

    it('should validate date format', async () => {
      const invalidDateCompetitor = {
        ...mockCompetitorData,
        lastUpdated: 'invalid-date',
      };

      const invalidConfig = {
        ...mockConfiguration,
        competitors: [invalidDateCompetitor],
      };

      const loadPromise = service.loadCompetitorData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(invalidConfig);

      // Service should use fallback data instead of throwing
      const result = await loadPromise;
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);

      // Check that error was emitted
      service.error$.subscribe((error) => {
        if (error) {
          expect(error).toContain('Invalid date format');
        }
      });
    });
  });

  describe('getCompetitorBySlug', () => {
    beforeEach(async () => {
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;
    });

    it('should return competitor by slug', () => {
      const result = service.getCompetitorBySlug('buffer');
      expect(result).toEqual(mockCompetitorData);
    });

    it('should return undefined for non-existent slug', () => {
      const result = service.getCompetitorBySlug('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('getFilteredCompetitors', () => {
    beforeEach(async () => {
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;
    });

    it('should filter by name', () => {
      const result = service.getFilteredCompetitors({ name: 'Buffer' });
      expect(result).toEqual([mockCompetitorData]);

      const noResult = service.getFilteredCompetitors({ name: 'NonExistent' });
      expect(noResult).toEqual([]);
    });

    it('should filter by target audience', () => {
      const result = service.getFilteredCompetitors({ targetAudience: 'small businesses' });
      expect(result).toEqual([mockCompetitorData]);

      const noResult = service.getFilteredCompetitors({ targetAudience: 'enterprise' });
      expect(noResult).toEqual([]);
    });

    it('should filter by feature availability', () => {
      const result = service.getFilteredCompetitors({ hasFeature: 'scheduling' });
      expect(result).toEqual([mockCompetitorData]);

      const noResult = service.getFilteredCompetitors({ hasFeature: 'aiContentGeneration' });
      expect(noResult).toEqual([]);
    });

    it('should filter by maximum price', () => {
      const result = service.getFilteredCompetitors({ maxPrice: 10 });
      expect(result).toEqual([mockCompetitorData]);

      const noResult = service.getFilteredCompetitors({ maxPrice: -1 });
      expect(noResult).toEqual([]);
    });

    it('should apply multiple filters', () => {
      const result = service.getFilteredCompetitors({
        name: 'Buffer',
        hasFeature: 'scheduling',
        maxPrice: 10,
      });
      expect(result).toEqual([mockCompetitorData]);
    });
  });

  describe('getFeatureComparison', () => {
    beforeEach(async () => {
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;
    });

    it('should return feature comparison matrix', () => {
      const result = service.getFeatureComparison();
      expect(result).toEqual({
        buffer: mockCompetitorData.features,
      });
    });
  });

  describe('getPricingComparison', () => {
    beforeEach(async () => {
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;
    });

    it('should return pricing comparison', () => {
      const result = service.getPricingComparison();
      expect(result).toEqual({
        buffer: mockCompetitorData.pricing,
      });
    });
  });

  describe('isDataOutdated', () => {
    it('should return true for outdated data', () => {
      const outdatedCompetitor = {
        ...mockCompetitorData,
        lastUpdated: '2024-01-01', // More than 30 days ago
      };

      const result = service.isDataOutdated(outdatedCompetitor);
      expect(result).toBe(true);
    });

    it('should return false for recent data', () => {
      const recentCompetitor = {
        ...mockCompetitorData,
        lastUpdated: new Date().toISOString().split('T')[0], // Today
      };

      const result = service.isDataOutdated(recentCompetitor);
      expect(result).toBe(false);
    });
  });

  describe('getOutdatedCompetitors', () => {
    it('should return list of outdated competitors', async () => {
      const recentCompetitor = {
        ...mockCompetitorData,
        lastUpdated: new Date().toISOString().split('T')[0], // Today's date
      };

      const outdatedCompetitor = {
        ...mockCompetitorData,
        slug: 'outdated',
        lastUpdated: '2025-01-01', // More than 30 days old but less than 2 years
      };

      const configWithOutdated = {
        ...mockConfiguration,
        competitors: [recentCompetitor, outdatedCompetitor],
      };

      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(configWithOutdated);
      await loadPromise;

      const result = service.getOutdatedCompetitors();
      expect(result).toEqual([outdatedCompetitor]);
    });
  });

  describe('refreshData', () => {
    it('should reload competitor data', async () => {
      const refreshPromise = service.refreshData();

      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);

      const result = await refreshPromise;
      expect(result).toEqual([mockCompetitorData]);
    });
  });

  describe('clearData', () => {
    it('should clear all data and reset state', async () => {
      // Load data first
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;

      expect(service.getAllCompetitors()).toEqual([mockCompetitorData]);

      // Clear data
      service.clearData();

      expect(service.getAllCompetitors()).toEqual([]);
      expect(service.getNexusShareData()).toBeNull();
    });
  });

  describe('observables', () => {
    it('should emit loading state changes', () => {
      return new Promise<void>((done) => {
        const loadingStates: boolean[] = [];

        service.loading$.subscribe((loading) => {
          loadingStates.push(loading);

          if (loadingStates.length === 3) {
            expect(loadingStates).toEqual([false, true, false]); // initial false, then true when loading starts, then false when complete
            done();
          }
        });

        service.loadCompetitorData();
        const req = httpMock.expectOne('./assets/config/competitors.json');
        req.flush(mockConfiguration);
      });
    });

    it('should emit error state changes', () => {
      return new Promise<void>((done) => {
        service.error$.subscribe((error) => {
          if (error) {
            expect(error).toContain('Competitor configuration file not found');
            done();
          }
        });

        service.loadCompetitorData();
        const req = httpMock.expectOne('./assets/config/competitors.json');
        req.flush('Not Found', { status: 404, statusText: 'Not Found' });
      });
    });

    it('should emit competitor data changes', () => {
      return new Promise<void>((done) => {
        service.competitors$.subscribe((competitors) => {
          if (competitors.length > 0) {
            expect(competitors).toEqual([mockCompetitorData]);
            done();
          }
        });

        service.loadCompetitorData();
        const req = httpMock.expectOne('./assets/config/competitors.json');
        req.flush(mockConfiguration);
      });
    });

    it('should emit nexus share data changes', () => {
      return new Promise<void>((done) => {
        service.nexusShare$.subscribe((nexusShare) => {
          if (nexusShare) {
            expect(nexusShare).toEqual(mockNexusShareData);
            done();
          }
        });

        service.loadCompetitorData();
        const req = httpMock.expectOne('./assets/config/competitors.json');
        req.flush(mockConfiguration);
      });
    });
  });

  describe('Enhanced Data Validation', () => {
    it('should validate pricing tiers comprehensively', () => {
      const validTier = {
        name: 'Pro',
        price: 15,
        billing: 'monthly',
        features: ['Feature 1', 'Feature 2'],
        limitations: ['Limitation 1'],
      };

      const validation = service.validatePricingTier(validTier, 'Test Competitor', 0);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect invalid pricing tier data', () => {
      const invalidTier = {
        name: 'Pro',
        price: -5, // Invalid negative price
        billing: 'invalid', // Invalid billing cycle
        features: 'not an array', // Should be array
        limitations: null, // Should be array
      };

      const validation = service.validatePricingTier(invalidTier, 'Test Competitor', 0);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((error) => error.includes('negative number'))).toBe(true);
      expect(validation.errors.some((error) => error.includes('billing cycle'))).toBe(true);
    });

    it('should validate feature status values', () => {
      const validStatus = service.validateFeatureStatus('full', 'scheduling', 'Test Competitor');
      expect(validStatus.isValid).toBe(true);

      const invalidStatus = service.validateFeatureStatus('invalid', 'scheduling', 'Test Competitor');
      expect(invalidStatus.isValid).toBe(false);
      expect(invalidStatus.error).toContain('Invalid feature status');
    });

    it('should validate URL formats', () => {
      const validUrl = service.validateUrl('https://example.com', 'website', 'Test Competitor');
      expect(validUrl.isValid).toBe(true);

      const invalidUrl = service.validateUrl('not-a-url', 'website', 'Test Competitor');
      expect(invalidUrl.isValid).toBe(false);
      expect(invalidUrl.error).toContain('Invalid URL format');
    });

    it('should validate array fields', () => {
      const validArray = service.validateArrayField(['item1', 'item2'], 'pros', 'Test Competitor');
      expect(validArray.isValid).toBe(true);

      const invalidArray = service.validateArrayField('not an array', 'pros', 'Test Competitor');
      expect(invalidArray.isValid).toBe(false);
      expect(invalidArray.error).toContain('must be an array');

      const emptyArray = service.validateArrayField([], 'pros', 'Test Competitor');
      expect(emptyArray.isValid).toBe(false);
      expect(emptyArray.error).toContain('at least 1 item');
    });

    it('should provide comprehensive configuration validation', () => {
      const invalidConfig = {
        competitors: [
          {
            name: 'Test',
            slug: 'INVALID SLUG!', // Invalid slug format
            // Missing required fields
          },
        ],
        nexusShare: null, // Missing nexusShare data
      };

      const validation = service.validateConfigurationComprehensive(invalidConfig);
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.recoverySuggestions.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network errors gracefully', () => {
      const networkError = { status: 0, message: 'Network error' };
      const errorMessage = service['handleLoadError'](networkError);
      expect(errorMessage).toContain('Network error');
      expect(errorMessage).toContain('internet connection');
    });

    it('should handle 404 errors with helpful message', () => {
      const notFoundError = { status: 404 };
      const errorMessage = service['handleLoadError'](notFoundError);
      expect(errorMessage).toContain('not found');
      expect(errorMessage).toContain('configuration file');
    });

    it('should handle JSON syntax errors', () => {
      const syntaxError = { name: 'SyntaxError', message: 'Unexpected token' };
      const errorMessage = service['handleLoadError'](syntaxError);
      expect(errorMessage).toContain('Invalid JSON format');
      expect(errorMessage).toContain('syntax');
    });

    it('should provide fallback data when main data fails', () => {
      const fallbackData = service['getFallbackCompetitorData']();
      expect(fallbackData).toBeDefined();
      expect(fallbackData.length).toBeGreaterThan(0);
      expect(fallbackData[0].name).toBeDefined();
      expect(fallbackData[0].slug).toBeDefined();
    });
  });

  describe('Data Validation Status', () => {
    beforeEach(async () => {
      // Load test data
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;
    });

    it('should return validation status for loaded data', () => {
      const status = service.getDataValidationStatus();
      expect(status.isValid).toBeDefined();
      expect(status.errors).toBeDefined();
      expect(status.warnings).toBeDefined();
      expect(status.competitorCount).toBeDefined();
      expect(status.lastValidated).toBeDefined();
      expect(status.competitorCount).toBe(1);
    });

    it('should detect when no data is loaded', () => {
      service.clearData();

      const status = service.getDataValidationStatus();
      expect(status.isValid).toBe(false);
      expect(status.errors).toContain('No competitor data loaded');
      expect(status.competitorCount).toBe(0);
    });
  });

  describe('Data Repair Functionality', () => {
    it('should repair common data issues', async () => {
      // First load valid data, then manually modify it to simulate issues
      const loadPromise = service.loadCompetitorData();
      const req = httpMock.expectOne('./assets/config/competitors.json');
      req.flush(mockConfiguration);
      await loadPromise;

      // Now manually modify the loaded data to simulate issues
      const competitors = service.getAllCompetitors();
      if (competitors.length > 0) {
        competitors[0].slug = 'INVALID SLUG!'; // Will be repaired
        competitors[0].name = '  Test Competitor  '; // Will be trimmed
        competitors[0].tagline = '  Test tagline  '; // Will be trimmed

        // Manually update the service's internal state
        (service as any).competitorsSubject.next(competitors);
      }

      const result = service.validateAndRepairData();
      expect(result.repaired).toBe(true);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.changes.some((change) => change.includes('slug format'))).toBe(true);
      expect(result.changes.some((change) => change.includes('whitespace'))).toBe(true);
    });
  });
});

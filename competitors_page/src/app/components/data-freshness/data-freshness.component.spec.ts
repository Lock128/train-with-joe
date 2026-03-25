import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { DataFreshnessComponent } from './data-freshness.component';
import { CompetitorDataService } from '../../services/competitor-data.service';
import type { CompetitorData } from '../../models/competitor.interface';

describe('DataFreshnessComponent', () => {
  let component: DataFreshnessComponent;
  let fixture: ComponentFixture<DataFreshnessComponent>;
  let mockCompetitorDataService: any;

  const mockCompetitor: CompetitorData = {
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
    lastUpdated: '2024-12-30',
  };

  beforeEach(async () => {
    mockCompetitorDataService = {
      getDataFreshnessStatus: vi.fn(),
      getOverallDataFreshness: vi.fn(),
      competitors$: {
        pipe: vi.fn().mockReturnValue({
          subscribe: vi.fn(),
        }),
      },
    };

    await TestBed.configureTestingModule({
      imports: [DataFreshnessComponent],
      providers: [{ provide: CompetitorDataService, useValue: mockCompetitorDataService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DataFreshnessComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize freshness status for competitor', () => {
    const mockStatus = {
      isOutdated: false,
      daysSinceUpdate: 5,
      lastUpdated: new Date('2024-12-30'),
      freshnessLevel: 'fresh' as const,
      disclaimer: '',
    };

    mockCompetitorDataService.getDataFreshnessStatus.mockReturnValue(mockStatus);
    component.competitor = mockCompetitor;

    component.ngOnInit();

    expect(mockCompetitorDataService.getDataFreshnessStatus).toHaveBeenCalledWith(mockCompetitor);
    expect(component.freshnessStatus).toEqual(mockStatus);
  });

  it('should initialize overall summary when requested', () => {
    const mockSummary = {
      totalCompetitors: 5,
      freshCount: 2,
      moderateCount: 2,
      outdatedCount: 1,
      staleCount: 0,
      oldestDataAge: 45,
      newestDataAge: 1,
      averageDataAge: 20,
      needsUpdateCount: 1,
    };

    // Mock the observable to immediately call the subscribe callback
    mockCompetitorDataService.competitors$.pipe.mockReturnValue({
      subscribe: vi.fn().mockImplementation((callback) => {
        callback([{ name: 'test' }]); // Simulate competitors data
        return { unsubscribe: vi.fn() };
      }),
    });
    mockCompetitorDataService.getOverallDataFreshness.mockReturnValue(mockSummary);
    component.showOverallSummary = true;

    component.ngOnInit();

    expect(mockCompetitorDataService.getOverallDataFreshness).toHaveBeenCalled();
    expect(component.overallSummary).toEqual(mockSummary);
  });

  describe('getFreshnessClass', () => {
    it('should return correct class for fresh data', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 5,
        lastUpdated: new Date(),
        freshnessLevel: 'fresh',
        disclaimer: '',
      };

      expect(component.getFreshnessClass()).toBe('freshness-fresh');
    });

    it('should return correct class for outdated data', () => {
      component.freshnessStatus = {
        isOutdated: true,
        daysSinceUpdate: 45,
        lastUpdated: new Date(),
        freshnessLevel: 'outdated',
        disclaimer: 'Data is outdated',
      };

      expect(component.getFreshnessClass()).toBe('freshness-outdated');
    });

    it('should return empty string when no freshness status', () => {
      component.freshnessStatus = undefined;
      expect(component.getFreshnessClass()).toBe('');
    });
  });

  describe('getFreshnessIcon', () => {
    it('should return checkmark for fresh data', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 5,
        lastUpdated: new Date(),
        freshnessLevel: 'fresh',
        disclaimer: '',
      };

      expect(component.getFreshnessIcon()).toBe('✓');
    });

    it('should return warning for outdated data', () => {
      component.freshnessStatus = {
        isOutdated: true,
        daysSinceUpdate: 45,
        lastUpdated: new Date(),
        freshnessLevel: 'outdated',
        disclaimer: 'Data is outdated',
      };

      expect(component.getFreshnessIcon()).toBe('⚠');
    });
  });

  describe('formatLastUpdated', () => {
    it('should format date correctly', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 5,
        lastUpdated: new Date('2024-12-30'),
        freshnessLevel: 'fresh',
        disclaimer: '',
      };

      const formatted = component.formatLastUpdated();
      expect(formatted).toContain('December');
      expect(formatted).toContain('30');
      expect(formatted).toContain('2024');
    });
  });

  describe('getRelativeTime', () => {
    it('should return "Updated today" for 0 days', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 0,
        lastUpdated: new Date(),
        freshnessLevel: 'fresh',
        disclaimer: '',
      };

      expect(component.getRelativeTime()).toBe('Updated today');
    });

    it('should return "Updated yesterday" for 1 day', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 1,
        lastUpdated: new Date(),
        freshnessLevel: 'fresh',
        disclaimer: '',
      };

      expect(component.getRelativeTime()).toBe('Updated yesterday');
    });

    it('should return days for less than a week', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 5,
        lastUpdated: new Date(),
        freshnessLevel: 'fresh',
        disclaimer: '',
      };

      expect(component.getRelativeTime()).toBe('Updated 5 days ago');
    });

    it('should return weeks for less than a month', () => {
      component.freshnessStatus = {
        isOutdated: false,
        daysSinceUpdate: 14,
        lastUpdated: new Date(),
        freshnessLevel: 'moderate',
        disclaimer: '',
      };

      expect(component.getRelativeTime()).toBe('Updated 2 weeks ago');
    });

    it('should return months for less than a year', () => {
      component.freshnessStatus = {
        isOutdated: true,
        daysSinceUpdate: 60,
        lastUpdated: new Date(),
        freshnessLevel: 'outdated',
        disclaimer: 'Data is outdated',
      };

      expect(component.getRelativeTime()).toBe('Updated 2 months ago');
    });

    it('should return years for more than a year', () => {
      component.freshnessStatus = {
        isOutdated: true,
        daysSinceUpdate: 400,
        lastUpdated: new Date(),
        freshnessLevel: 'stale',
        disclaimer: 'Data is very outdated',
      };

      expect(component.getRelativeTime()).toBe('Updated 1 year ago');
    });
  });
});

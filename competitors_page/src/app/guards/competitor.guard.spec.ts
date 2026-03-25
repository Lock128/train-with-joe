import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CompetitorGuard } from './competitor.guard';
import { CompetitorDataService } from '../services/competitor-data.service';
import type { CompetitorData } from '../models/competitor.interface';

describe('CompetitorGuard', () => {
  let guard: CompetitorGuard;
  let mockCompetitorDataService: ReturnType<typeof vi.fn>;
  let mockRouter: ReturnType<typeof vi.fn>;

  const mockCompetitor: CompetitorData = {
    name: 'Buffer',
    slug: 'buffer',
    tagline: 'Test tagline',
    logo: '/test.png',
    website: 'https://buffer.com',
    pricing: [
      {
        name: 'Free',
        price: 0,
        billing: 'monthly',
        features: ['Basic features'],
        limitations: ['Limited usage'],
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
    pros: ['Good interface'],
    cons: ['Limited features'],
    targetAudience: 'Small businesses',
    lastUpdated: '2024-01-01',
  };

  beforeEach(() => {
    const competitorDataServiceMock = {
      getAllCompetitors: vi.fn(),
      loadCompetitorData: vi.fn(),
      getCompetitorBySlug: vi.fn(),
    };
    const routerMock = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CompetitorGuard,
        { provide: CompetitorDataService, useValue: competitorDataServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    guard = TestBed.inject(CompetitorGuard);
    mockCompetitorDataService = TestBed.inject(CompetitorDataService) as any;
    mockRouter = TestBed.inject(Router) as any;
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });

  it('should redirect to overview when no competitor slug is provided', async () => {
    const mockRoute = { params: {} } as any;

    const result = await guard.canActivate(mockRoute);

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  });

  it('should allow access when valid competitor slug is provided', async () => {
    const mockRoute = { params: { competitor: 'buffer' } } as any;

    mockCompetitorDataService.getAllCompetitors.mockReturnValue([mockCompetitor]);
    mockCompetitorDataService.getCompetitorBySlug.mockReturnValue(mockCompetitor);

    const result = await guard.canActivate(mockRoute);

    expect(result).toBe(true);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it('should redirect to overview with error when invalid competitor slug is provided', async () => {
    const mockRoute = { params: { competitor: 'invalid-competitor' } } as any;

    mockCompetitorDataService.getAllCompetitors.mockReturnValue([mockCompetitor]);
    mockCompetitorDataService.getCompetitorBySlug.mockReturnValue(undefined);

    const result = await guard.canActivate(mockRoute);

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: {
        error: 'competitor-not-found',
        slug: 'invalid-competitor',
      },
    });
  });

  it('should load competitor data if not already loaded', async () => {
    const mockRoute = { params: { competitor: 'buffer' } } as any;

    mockCompetitorDataService.getAllCompetitors.mockReturnValue([]);
    mockCompetitorDataService.loadCompetitorData.mockResolvedValue([mockCompetitor]);
    mockCompetitorDataService.getCompetitorBySlug.mockReturnValue(mockCompetitor);

    const result = await guard.canActivate(mockRoute);

    expect(result).toBe(true);
    expect(mockCompetitorDataService.loadCompetitorData).toHaveBeenCalled();
  });

  it('should handle data loading errors gracefully', async () => {
    const mockRoute = { params: { competitor: 'buffer' } } as any;

    mockCompetitorDataService.getAllCompetitors.mockReturnValue([]);
    mockCompetitorDataService.loadCompetitorData.mockRejectedValue(new Error('Network error'));

    const result = await guard.canActivate(mockRoute);

    expect(result).toBe(false);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/'], {
      queryParams: {
        error: 'data-load-failed',
      },
    });
  });
});

import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { CompetitorDataService } from '../services/competitor-data.service';

/**
 * Route guard to validate competitor slugs and handle invalid routes
 * Implements requirements 2.1, 7.4 for parameterized routing and error handling
 */
@Injectable({
  providedIn: 'root',
})
export class CompetitorGuard implements CanActivate {
  constructor(
    private competitorDataService: CompetitorDataService,
    private router: Router,
  ) {}

  async canActivate(route: ActivatedRouteSnapshot): Promise<boolean> {
    const competitorSlug = route.params['competitor'];

    if (!competitorSlug) {
      // No competitor slug provided, redirect to overview
      this.router.navigate(['/']);
      return false;
    }

    try {
      // Ensure competitor data is loaded
      const competitors = this.competitorDataService.getAllCompetitors();
      if (competitors.length === 0) {
        await this.competitorDataService.loadCompetitorData();
      }

      // Check if competitor exists
      const competitor = this.competitorDataService.getCompetitorBySlug(competitorSlug);

      if (!competitor) {
        // Invalid competitor slug, redirect to overview with error message
        console.warn(`Invalid competitor slug: ${competitorSlug}`);
        this.router.navigate(['/'], {
          queryParams: {
            error: 'competitor-not-found',
            slug: competitorSlug,
          },
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating competitor route:', error);
      // On error, redirect to overview
      this.router.navigate(['/'], {
        queryParams: {
          error: 'data-load-failed',
        },
      });
      return false;
    }
  }
}

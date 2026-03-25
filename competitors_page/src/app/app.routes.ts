import type { Routes } from '@angular/router';
import { CompetitorGuard } from './guards/competitor.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/comparison-overview/comparison-overview.component').then(
        (m) => m.ComparisonOverviewComponent,
      ),
    title: 'Nexus Share vs Competitors - Social Media Management Comparison',
  },
  {
    path: ':competitor',
    loadComponent: () =>
      import('./components/competitor-detail/competitor-detail.component').then((m) => m.CompetitorDetailComponent),
    canActivate: [CompetitorGuard],
    title: 'Nexus Share vs Competitor - Detailed Comparison',
  },
  {
    path: '**',
    redirectTo: '',
  },
];

import type { Routes } from '@angular/router';
import { ProfileCardComponent } from './components/profile-card/profile-card.component';
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';

export const routes: Routes = [
  // Leaderboard routes with optional tab parameter
  { path: 'leaderboard/tags/:tagName', component: LeaderboardComponent },
  { path: 'leaderboard/:tab', component: LeaderboardComponent },
  { path: 'leaderboard', component: LeaderboardComponent },

  // User profile card route
  { path: ':userId', component: ProfileCardComponent },

  // Default route redirects to leaderboard
  { path: '', redirectTo: '/leaderboard', pathMatch: 'full' },

  // 404 - redirect to leaderboard
  { path: '**', redirectTo: '/leaderboard' },
];

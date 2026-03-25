import type { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProfileCardService } from '../../services/profile-card.service';
import { MetaService } from '../../services/meta.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { ProfileCardData } from '../../models/profile-card.model';
import { MetricsDisplayComponent } from '../metrics-display/metrics-display.component';
import { RecentPostsComponent } from '../recent-posts/recent-posts.component';
import { ContributionGraphComponent } from '../contribution-graph/contribution-graph.component';

@Component({
  selector: 'app-profile-card',
  templateUrl: './profile-card.component.html',
  styleUrls: ['./profile-card.component.css'],
  standalone: true,
  imports: [CommonModule, MetricsDisplayComponent, RecentPostsComponent, ContributionGraphComponent],
})
export class ProfileCardComponent implements OnInit {
  profileData: ProfileCardData | null = null;
  loading = true;
  error: string | null = null;
  userId: string | null = null;
  private loadStartTime: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private profileCardService: ProfileCardService,
    private metaService: MetaService,
    private analyticsService: AnalyticsService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.userId = params.get('userId');
      if (this.userId) {
        this.loadProfileCard(this.userId);
      } else {
        this.error = 'No user ID provided';
        this.loading = false;
      }
    });
  }

  loadProfileCard(userId: string): void {
    this.loading = true;
    this.error = null;
    this.loadStartTime = Date.now();

    this.profileCardService.fetchProfileCard(userId).subscribe({
      next: (data) => {
        this.profileData = data;
        this.loading = false;

        // Calculate load time
        const loadTime = Date.now() - this.loadStartTime;

        // Update meta tags with profile data
        this.metaService.setProfileCardTags(data, userId);

        // Track analytics
        const referrer = typeof document !== 'undefined' ? document.referrer : '';
        this.analyticsService.trackProfileCardView(userId, referrer);
        this.analyticsService.trackLoadTime(userId, loadTime);
      },
      error: (err) => {
        console.error('Error loading profile card:', err);

        const errorType = err.status === 404 ? 'not_found' : 'load_error';
        const errorMessage = err.status === 404 ? 'Profile not found' : 'Failed to load profile';

        if (err.status === 404) {
          this.error = 'Profile not found';
        } else {
          this.error = 'Failed to load profile. Please try again.';
        }
        this.loading = false;

        // Set default meta tags on error
        this.metaService.setDefaultTags();

        // Track error
        this.analyticsService.trackError(errorType, errorMessage, userId);
      },
    });
  }

  retry(): void {
    if (this.userId) {
      this.loadProfileCard(this.userId);
    }
  }

  goToLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

import { OnInit, OnDestroy } from '@angular/core';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import type { CompetitorData } from '../../models/competitor.interface';
import { CompetitorDataService } from '../../services/competitor-data.service';

/**
 * Component for displaying data freshness information and disclaimers
 * Implements requirement 6.4: Display disclaimers for outdated information
 */
@Component({
  selector: 'app-data-freshness',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-freshness.component.html',
  styleUrls: ['./data-freshness.component.scss'],
})
export class DataFreshnessComponent implements OnInit, OnDestroy {
  @Input() competitor?: CompetitorData;
  @Input() showOverallSummary = false;
  @Input() compact = false;

  private destroy$ = new Subject<void>();
  isExpanded = false; // Start collapsed

  freshnessStatus?: {
    isOutdated: boolean;
    daysSinceUpdate: number;
    lastUpdated: Date;
    freshnessLevel: 'fresh' | 'moderate' | 'outdated' | 'stale';
    disclaimer: string;
  };

  overallSummary?: {
    totalCompetitors: number;
    freshCount: number;
    moderateCount: number;
    outdatedCount: number;
    staleCount: number;
    oldestDataAge: number;
    newestDataAge: number;
    averageDataAge: number;
    needsUpdateCount: number;
  };

  constructor(private competitorDataService: CompetitorDataService) {}

  ngOnInit(): void {
    if (this.competitor) {
      this.freshnessStatus = this.competitorDataService.getDataFreshnessStatus(this.competitor);
    }

    if (this.showOverallSummary) {
      // Subscribe to competitors data changes instead of calling once
      this.competitorDataService.competitors$.pipe(takeUntil(this.destroy$)).subscribe((competitors) => {
        if (competitors.length > 0) {
          this.overallSummary = this.competitorDataService.getOverallDataFreshness();
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  /**
   * Get CSS class for freshness level styling
   */
  getFreshnessClass(): string {
    if (!this.freshnessStatus) return '';

    switch (this.freshnessStatus.freshnessLevel) {
      case 'fresh':
        return 'freshness-fresh';
      case 'moderate':
        return 'freshness-moderate';
      case 'outdated':
        return 'freshness-outdated';
      case 'stale':
        return 'freshness-stale';
      default:
        return '';
    }
  }

  /**
   * Get icon for freshness level
   */
  getFreshnessIcon(): string {
    if (!this.freshnessStatus) return '';

    switch (this.freshnessStatus.freshnessLevel) {
      case 'fresh':
        return '✓';
      case 'moderate':
        return '⚠';
      case 'outdated':
        return '⚠';
      case 'stale':
        return '⚠';
      default:
        return '';
    }
  }

  /**
   * Format the last updated date for display
   */
  formatLastUpdated(): string {
    if (!this.freshnessStatus) return '';

    const date = this.freshnessStatus.lastUpdated;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Get relative time description
   */
  getRelativeTime(): string {
    if (!this.freshnessStatus) return '';

    const days = this.freshnessStatus.daysSinceUpdate;

    if (days === 0) {
      return 'Updated today';
    } else if (days === 1) {
      return 'Updated yesterday';
    } else if (days < 7) {
      return `Updated ${days} days ago`;
    } else if (days < 30) {
      const weeks = Math.floor(days / 7);
      return `Updated ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      return `Updated ${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(days / 365);
      return `Updated ${years} year${years > 1 ? 's' : ''} ago`;
    }
  }
}

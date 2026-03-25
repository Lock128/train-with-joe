import { OnInit } from '@angular/core';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type {
  CompetitorData,
  FeatureComparison,
  FeatureStatus,
  TrainWithJoeData,
} from '../../models/competitor.interface';

/**
 * Feature matrix component for displaying responsive feature comparison table
 * Implements requirements 3.2, 3.4, 3.5 for feature comparison display
 */
@Component({
  selector: 'app-feature-matrix',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './feature-matrix.component.html',
  styleUrls: ['./feature-matrix.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureMatrixComponent implements OnInit {
  @Input() competitors: CompetitorData[] = [];
  @Input() trainWithJoe: TrainWithJoeData | null = null;
  @Input() showTooltips: boolean = true;
  @Input() highlightTrainWithJoe: boolean = true;

  // Feature definitions with display names and descriptions for tooltips
  featureDefinitions = [
    {
      key: 'multiPlatformPosting' as keyof FeatureComparison,
      displayName: 'Multi-Platform Posting',
      description: 'Ability to post to multiple social media platforms simultaneously from a single interface',
    },
    {
      key: 'aiContentGeneration' as keyof FeatureComparison,
      displayName: 'AI Content Generation',
      description: 'AI-powered content creation and enhancement features to improve post quality and engagement',
    },
    {
      key: 'scheduling' as keyof FeatureComparison,
      displayName: 'Post Scheduling',
      description: 'Schedule posts for future publication at optimal times for audience engagement',
    },
    {
      key: 'analytics' as keyof FeatureComparison,
      displayName: 'Analytics & Insights',
      description: 'Detailed performance analytics and insights for posts and social media accounts',
    },
    {
      key: 'teamCollaboration' as keyof FeatureComparison,
      displayName: 'Team Collaboration',
      description: 'Multi-user access with role-based permissions for team-based social media management',
    },
    {
      key: 'mentionResolution' as keyof FeatureComparison,
      displayName: 'Mention Resolution',
      description: 'Intelligent @ mention resolution that maps to appropriate user profiles across different platforms',
    },
    {
      key: 'contentRecycling' as keyof FeatureComparison,
      displayName: 'Content Recycling',
      description: 'Automatically repost high-performing content at optimal intervals to maximize reach',
    },
    {
      key: 'visualPlanning' as keyof FeatureComparison,
      displayName: 'Visual Content Planning',
      description: 'Visual calendar and planning tools for organizing and previewing content schedules',
    },
    {
      key: 'socialListening' as keyof FeatureComparison,
      displayName: 'Social Listening',
      description: 'Monitor brand mentions, keywords, and conversations across social media platforms',
    },
  ];

  // Tooltip state management
  activeTooltip: string | null = null;
  tooltipTimeout: NodeJS.Timeout | null = null;

  ngOnInit(): void {
    // Component initialization logic if needed
  }

  /**
   * Get the visual indicator class for a feature status
   * Implements requirement 3.2: Use clear visual indicators
   */
  getFeatureStatusClass(status: FeatureStatus): string {
    switch (status) {
      case 'full':
        return 'feature-status-full';
      case 'partial':
        return 'feature-status-partial';
      case 'premium':
        return 'feature-status-premium';
      case 'none':
      default:
        return 'feature-status-none';
    }
  }

  /**
   * Get the visual indicator icon for a feature status
   * Implements requirement 3.2: Use clear visual indicators (checkmarks, X marks, partial support)
   */
  getFeatureStatusIcon(status: FeatureStatus): string {
    switch (status) {
      case 'full':
        return '✓'; // Checkmark for full support
      case 'partial':
        return '◐'; // Half-circle for partial support
      case 'premium':
        return '★'; // Star for premium feature
      case 'none':
      default:
        return '✗'; // X mark for no support
    }
  }

  /**
   * Get the accessibility label for a feature status
   */
  getFeatureStatusLabel(status: FeatureStatus): string {
    switch (status) {
      case 'full':
        return 'Full support';
      case 'partial':
        return 'Partial support';
      case 'premium':
        return 'Premium feature';
      case 'none':
      default:
        return 'Not supported';
    }
  }

  /**
   * Get Train with Joe feature status for comparison
   */
  getTrainWithJoeFeatureStatus(featureKey: keyof FeatureComparison): FeatureStatus {
    // For Train with Joe, we'll define our feature support levels
    // This could be moved to configuration in the future
    const trainWithJoeFeatures: FeatureComparison = {
      multiPlatformPosting: 'full',
      aiContentGeneration: 'full', // Our unique advantage
      scheduling: 'full',
      analytics: 'partial', // Basic analytics in free tier
      teamCollaboration: 'premium', // Available in paid tier
      mentionResolution: 'full', // Our unique advantage
      contentRecycling: 'partial', // Basic recycling features
      visualPlanning: 'partial', // Basic visual planning
      socialListening: 'none', // Not currently supported
    };

    return trainWithJoeFeatures[featureKey];
  }

  /**
   * Check if Train with Joe has an advantage for this feature
   * Implements requirement 3.3: Highlight unique Train with Joe features
   */
  isTrainWithJoeAdvantage(featureKey: keyof FeatureComparison): boolean {
    const trainWithJoeStatus = this.getTrainWithJoeFeatureStatus(featureKey);

    // Train with Joe has an advantage if it has full support and others don't,
    // or if it's one of our unique features
    const uniqueFeatures: (keyof FeatureComparison)[] = ['aiContentGeneration', 'mentionResolution'];

    if (uniqueFeatures.includes(featureKey) && trainWithJoeStatus === 'full') {
      return true;
    }

    // Check if we have better support than competitors
    if (trainWithJoeStatus === 'full') {
      const competitorStatuses = this.competitors.map((c) => c.features[featureKey]);
      return competitorStatuses.every((status) => status !== 'full');
    }

    return false;
  }

  /**
   * Show tooltip for feature explanation
   * Implements requirement 3.4: Provide tooltips for feature explanations
   */
  showTooltip(featureKey: string, _event: MouseEvent): void {
    if (!this.showTooltips) return;

    // Clear any existing timeout
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }

    this.activeTooltip = featureKey;
  }

  /**
   * Hide tooltip with delay
   * Implements requirement 3.4: Provide tooltips for feature explanations
   */
  hideTooltip(): void {
    if (!this.showTooltips) return;

    // Add small delay to prevent flickering when moving between elements
    this.tooltipTimeout = setTimeout(() => {
      this.activeTooltip = null;
    }, 200);
  }

  /**
   * Hide tooltip immediately (for keyboard navigation)
   */
  hideTooltipImmediate(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
    this.activeTooltip = null;
  }

  /**
   * Handle keyboard navigation for tooltips
   */
  onTooltipKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.hideTooltipImmediate();
      // Return focus to the trigger button
      const triggerButton = event.target as HTMLElement;
      if (triggerButton) {
        triggerButton.focus();
      }
    }
  }

  /**
   * Keep tooltip visible when hovering over it
   */
  keepTooltipVisible(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
    }
  }

  /**
   * Get feature description for tooltip
   */
  getFeatureDescription(featureKey: keyof FeatureComparison): string {
    const feature = this.featureDefinitions.find((f) => f.key === featureKey);
    return feature?.description || '';
  }

  /**
   * Get feature display name
   */
  getFeatureDisplayName(featureKey: keyof FeatureComparison): string {
    const feature = this.featureDefinitions.find((f) => f.key === featureKey);
    return feature?.displayName || featureKey;
  }

  /**
   * Track by function for competitor list to optimize rendering
   */
  trackByCompetitor(index: number, competitor: CompetitorData): string {
    return competitor.slug;
  }

  /**
   * Track by function for feature list to optimize rendering
   */
  trackByFeature(
    index: number,
    feature: { key: keyof FeatureComparison; displayName: string; description: string },
  ): string {
    return feature.key;
  }
}

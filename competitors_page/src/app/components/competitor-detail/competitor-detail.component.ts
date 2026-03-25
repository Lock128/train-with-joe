import { OnInit, OnDestroy } from '@angular/core';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CompetitorDataService } from '../../services/competitor-data.service';
import { OGMetaService } from '../../services/og-meta.service';
import type { CompetitorData, YourProductData, FeatureStatus } from '../../models/competitor.interface';

@Component({
  selector: 'app-competitor-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './competitor-detail.component.html',
  styleUrls: ['./competitor-detail.component.scss'],
})
export class CompetitorDetailComponent implements OnInit, OnDestroy {
  competitor: CompetitorData | null = null;
  yourProduct: YourProductData | null = null;
  competitorSlug: string = '';
  loading = true;
  error: string | null = null;
  isDataOutdated = false;

  private destroy$ = new Subject<void>();

  // Feature display names for better UX
  featureDisplayNames: { [key: string]: string } = {
    multiPlatformPosting: 'Multi-Platform Publishing',
    aiContentGeneration: 'AI Content Generation',
    scheduling: 'Post Scheduling',
    analytics: 'Analytics & Reporting',
    teamCollaboration: 'Team Collaboration',
    mentionResolution: 'Mention Resolution',
    contentRecycling: 'Content Recycling',
    visualPlanning: 'Visual Content Planning',
    socialListening: 'Social Media Listening',
  };

  // Sample testimonials for different competitors
  testimonials: { [key: string]: Array<{ name: string; role: string; company: string; quote: string }> } = {
    buffer: [
      {
        name: 'Sarah Chen',
        role: 'Marketing Manager',
        company: 'TechStart Inc',
        quote:
          "Switched from Buffer for the AI content enhancement. The quality improvement in our posts has been remarkable, and we're saving hours each week.",
      },
      {
        name: 'Mike Rodriguez',
        role: 'Social Media Coordinator',
        company: 'Creative Agency',
        quote:
          "Buffer's pricing was getting expensive for our team. This tool gives us more features at a fraction of the cost, plus the AI suggestions are game-changing.",
      },
    ],
    postplanify: [
      {
        name: 'Emma Thompson',
        role: 'Content Creator',
        company: 'Lifestyle Brand',
        quote:
          'PostPlanify was good, but the mention resolution feature saves me so much time. No more manually updating handles for different platforms.',
      },
      {
        name: 'David Park',
        role: 'Digital Marketing Lead',
        company: 'E-commerce Store',
        quote:
          'The switch from PostPlanify was seamless. Better features, better pricing, and the AI content enhancement is incredible.',
      },
    ],
    hootsuite: [
      {
        name: 'Lisa Wang',
        role: 'Brand Manager',
        company: 'Fashion Retailer',
        quote:
          'Hootsuite was overwhelming and expensive. This platform is intuitive, affordable, and the AI features help us create better content consistently.',
      },
      {
        name: 'James Miller',
        role: 'Marketing Director',
        company: 'SaaS Company',
        quote:
          'Made the switch from Hootsuite last month. The streamlined interface and powerful AI tools have improved our social media efficiency dramatically.',
      },
    ],
    later: [
      {
        name: 'Rachel Green',
        role: 'Social Media Manager',
        company: 'Non-profit Organization',
        quote:
          "Later was limiting our growth. The free tier offers more features than Later's paid plans, and the AI content suggestions are phenomenal.",
      },
      {
        name: 'Tom Anderson',
        role: 'Marketing Specialist',
        company: 'Local Business',
        quote:
          'Switched from Later for the advanced scheduling and AI features. Our engagement rates have increased by 40% since the switch.',
      },
    ],
    socialbee: [
      {
        name: 'Maria Garcia',
        role: 'Content Manager',
        company: 'Digital Agency',
        quote:
          'SocialBee was complex and pricey. This tool simplifies everything while providing better AI-powered content enhancement and mention resolution.',
      },
      {
        name: 'Alex Johnson',
        role: 'Freelance Marketer',
        company: 'Independent Consultant',
        quote:
          'The migration from SocialBee was worth it. Better features, cleaner interface, and the AI content generation saves me hours daily.',
      },
    ],
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private competitorDataService: CompetitorDataService,
    private ogMetaService: OGMetaService,
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      this.competitorSlug = params['competitor'] || '';
      this.loadCompetitorData();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadCompetitorData(): Promise<void> {
    try {
      this.loading = true;
      this.error = null;

      // Load data if not already loaded
      const competitors = this.competitorDataService.getAllCompetitors();
      if (competitors.length === 0) {
        await this.competitorDataService.loadCompetitorData();
      }

      // Get competitor data
      const foundCompetitor = this.competitorDataService.getCompetitorBySlug(this.competitorSlug);
      this.competitor = foundCompetitor || null;
      this.yourProduct = this.competitorDataService.getYourProductData();

      if (!this.competitor) {
        this.error = `Competitor "${this.competitorSlug}" not found`;
        this.loading = false;
        return;
      }

      // Check if data is outdated
      this.isDataOutdated = this.competitorDataService.isDataOutdated(this.competitor);

      // Update SEO meta tags for competitor comparison
      this.ogMetaService.updateCompetitorComparisonMeta(this.competitor);

      this.loading = false;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to load competitor data';
      this.loading = false;
    }
  }

  getFeatureStatus(status: FeatureStatus): { icon: string; class: string; text: string } {
    switch (status) {
      case 'full':
        return { icon: '✓', class: 'feature-full', text: 'Full Support' };
      case 'partial':
        return { icon: '◐', class: 'feature-partial', text: 'Partial Support' };
      case 'premium':
        return { icon: '★', class: 'feature-premium', text: 'Premium Only' };
      case 'none':
      default:
        return { icon: '✗', class: 'feature-none', text: 'Not Available' };
    }
  }

  getYourProductFeatureStatus(featureKey: string): { icon: string; class: string; text: string } {
    // Your Product has full support for most features, premium for advanced ones
    const premiumFeatures = ['socialListening', 'teamCollaboration'];
    const status = premiumFeatures.includes(featureKey) ? 'premium' : 'full';
    return this.getFeatureStatus(status);
  }

  calculateMonthlySavings(): number {
    if (!this.competitor || !this.yourProduct) return 0;

    // Compare similar tier pricing (usually the second tier for fair comparison)
    const competitorTier = this.competitor.pricing.length > 1 ? this.competitor.pricing[1] : this.competitor.pricing[0];
    const yourProductTier =
      this.yourProduct.pricing.length > 1 ? this.yourProduct.pricing[1] : this.yourProduct.pricing[0];

    // Skip calculation if either price is custom
    if (typeof competitorTier.price !== 'number' || typeof yourProductTier.price !== 'number') {
      return 0;
    }

    return Math.max(0, competitorTier.price - yourProductTier.price);
  }

  calculateAnnualSavings(): number {
    return this.calculateMonthlySavings() * 12;
  }

  getTestimonials(): Array<{ name: string; role: string; company: string; quote: string }> {
    return this.testimonials[this.competitorSlug] || [];
  }

  getCompetitorFeatureStatus(featureKey: string): { icon: string; class: string; text: string } {
    if (!this.competitor) {
      return this.getFeatureStatus('none');
    }

    const feature = this.competitor.features[featureKey as keyof typeof this.competitor.features];
    return this.getFeatureStatus(feature);
  }

  goToOverview(): void {
    this.router.navigate(['/']);
  }

  getOtherCompetitors(): CompetitorData[] {
    const allCompetitors = this.competitorDataService.getAllCompetitors();
    return allCompetitors.filter((comp) => comp.slug !== this.competitorSlug).slice(0, 3);
  }
}

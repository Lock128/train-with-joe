import { OnInit } from '@angular/core';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CompetitorData, PricingTier, NexusShareData, BillingCycle } from '../../models/competitor.interface';

/**
 * Pricing table component for displaying responsive pricing comparison table
 * Implements requirements 4.1, 4.2, 4.3, 4.5 for pricing comparison display
 */
@Component({
  selector: 'app-pricing-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing-table.component.html',
  styleUrls: ['./pricing-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingTableComponent implements OnInit {
  @Input() competitors: CompetitorData[] = [];
  @Input() nexusShare: NexusShareData | null = null;
  @Input() showNexusShare: boolean = true;
  @Input() highlightSavings: boolean = true;
  @Input() showAnnualPricing: boolean = true;
  @Input() currency: string = '€';

  // Billing cycle toggle
  selectedBillingCycle: BillingCycle = 'monthly';

  ngOnInit(): void {
    // Component initialization logic if needed
  }

  /**
   * Get pricing tiers for a specific billing cycle
   * Implements requirement 4.5: Include annual vs monthly pricing comparisons
   */
  getPricingForBilling(pricing: PricingTier[], billing: BillingCycle): PricingTier[] {
    return pricing.filter((tier) => tier.billing === billing);
  }

  /**
   * Get the lowest price tier for a competitor
   * Used for cost savings calculations
   */
  getLowestPriceTier(pricing: PricingTier[], billing: BillingCycle): PricingTier | null {
    const tiersForBilling = this.getPricingForBilling(pricing, billing);
    if (tiersForBilling.length === 0) return null;

    // Filter out custom pricing tiers for comparison
    const numericTiers = tiersForBilling.filter((tier) => typeof tier.price === 'number');
    if (numericTiers.length === 0) return tiersForBilling[0];

    return numericTiers.reduce((lowest, current) =>
      (current.price as number) < (lowest.price as number) ? current : lowest,
    );
  }

  /**
   * Get the highest price tier for a competitor
   * Used for pricing range display
   */
  getHighestPriceTier(pricing: PricingTier[], billing: BillingCycle): PricingTier | null {
    const tiersForBilling = this.getPricingForBilling(pricing, billing);
    if (tiersForBilling.length === 0) return null;

    // Filter out custom pricing tiers for comparison
    const numericTiers = tiersForBilling.filter((tier) => typeof tier.price === 'number');
    if (numericTiers.length === 0) return tiersForBilling[0];

    return numericTiers.reduce((highest, current) =>
      (current.price as number) > (highest.price as number) ? current : highest,
    );
  }

  /**
   * Calculate cost savings compared to Nexus Share
   * Implements requirement 4.2: Calculate and highlight potential cost savings
   */
  calculateSavings(competitorPrice: number, nexusSharePrice: number): number {
    return Math.max(0, competitorPrice - nexusSharePrice);
  }

  /**
   * Calculate percentage savings
   */
  calculateSavingsPercentage(competitorPrice: number, nexusSharePrice: number): number {
    if (competitorPrice === 0) return 0;
    const savings = this.calculateSavings(competitorPrice, nexusSharePrice);
    return Math.round((savings / competitorPrice) * 100);
  }

  /**
   * Get Nexus Share pricing for comparison
   */
  getNexusSharePricing(billing: BillingCycle): PricingTier[] {
    if (!this.nexusShare) return [];
    return this.getPricingForBilling(this.nexusShare.pricing, billing);
  }

  /**
   * Get comparable Nexus Share tier for cost comparison
   * Matches based on price range or feature similarity
   */
  getComparableNexusShareTier(competitorTier: PricingTier): PricingTier | null {
    const nexusShareTiers = this.getNexusSharePricing(competitorTier.billing);
    if (nexusShareTiers.length === 0) return null;

    // If competitor has custom pricing, return highest Nexus Share tier
    if (typeof competitorTier.price !== 'number') {
      return nexusShareTiers[nexusShareTiers.length - 1];
    }

    // If competitor is free, compare with free tier
    if (competitorTier.price === 0) {
      return nexusShareTiers.find((tier) => tier.price === 0) || nexusShareTiers[0];
    }

    // Otherwise, find the closest price tier
    return nexusShareTiers.reduce((closest, current) => {
      if (typeof current.price !== 'number') return closest;
      const currentDiff = Math.abs((current.price as number) - (competitorTier.price as number));
      const closestDiff =
        typeof closest.price === 'number'
          ? Math.abs((closest.price as number) - (competitorTier.price as number))
          : Infinity;
      return currentDiff < closestDiff ? current : closest;
    });
  }

  /**
   * Check if Nexus Share offers better value for a given tier
   * Implements requirement 4.2: Highlight cost savings with Nexus Share
   */
  isNexusShareBetterValue(competitorTier: PricingTier): boolean {
    const comparableTier = this.getComparableNexusShareTier(competitorTier);
    if (!comparableTier) return false;

    // Can't compare custom pricing
    if (typeof competitorTier.price !== 'number' || typeof comparableTier.price !== 'number') {
      return false;
    }

    // Better value if Nexus Share is cheaper or same price with more features
    if (comparableTier.price < competitorTier.price) return true;

    // If same price, compare feature count (rough heuristic)
    if (comparableTier.price === competitorTier.price) {
      return comparableTier.features.length >= competitorTier.features.length;
    }

    return false;
  }

  /**
   * Format price display
   * Implements requirement 4.1: Display current pricing for all platforms
   */
  formatPrice(price: number | 'Custom', billing: BillingCycle): string {
    if (typeof price === 'string') return price;
    if (price === 0) return 'Free';

    const formattedPrice = `${this.currency}${price}`;
    const billingText = billing === 'monthly' ? '/mo' : billing === 'annual' ? '/year' : '';

    return `${formattedPrice}${billingText}`;
  }

  /**
   * Get annual equivalent price for monthly pricing
   */
  getAnnualEquivalent(monthlyPrice: number): number {
    return monthlyPrice * 12;
  }

  /**
   * Get monthly equivalent price for annual pricing
   */
  getMonthlyEquivalent(annualPrice: number): number {
    return Math.round((annualPrice / 12) * 100) / 100;
  }

  /**
   * Toggle between monthly and annual billing
   */
  toggleBillingCycle(): void {
    this.selectedBillingCycle = this.selectedBillingCycle === 'monthly' ? 'annual' : 'monthly';
  }

  /**
   * Get all unique tier names across competitors for table structure
   */
  getAllTierNames(): string[] {
    const tierNames = new Set<string>();

    // Add Nexus Share tier names
    if (this.nexusShare) {
      this.nexusShare.pricing.forEach((tier) => tierNames.add(tier.name));
    }

    // Add competitor tier names
    this.competitors.forEach((competitor) => {
      competitor.pricing.forEach((tier) => tierNames.add(tier.name));
    });

    // Sort tiers by typical order (Free, Basic/Essentials, Pro/Professional, Enterprise)
    const tierOrder = [
      'Free',
      'Basic',
      'Essentials',
      'Starter',
      'Pro',
      'Professional',
      'Premium',
      'Business',
      'Enterprise',
      'Ultimate',
    ];

    return Array.from(tierNames).sort((a, b) => {
      const aIndex = tierOrder.findIndex((order) => a.toLowerCase().includes(order.toLowerCase()));
      const bIndex = tierOrder.findIndex((order) => b.toLowerCase().includes(order.toLowerCase()));

      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }

  /**
   * Get tier by name for a specific competitor
   */
  getTierByName(pricing: PricingTier[], tierName: string, billing: BillingCycle): PricingTier | null {
    return pricing.find((tier) => tier.name === tierName && tier.billing === billing) || null;
  }

  /**
   * Check if a tier has feature limitations
   * Implements requirement 4.3: Include feature limitations for each pricing tier
   */
  hasLimitations(tier: PricingTier): boolean {
    return tier.limitations && tier.limitations.length > 0;
  }

  /**
   * Get feature count for a tier
   */
  getFeatureCount(tier: PricingTier): number {
    return tier.features ? tier.features.length : 0;
  }

  /**
   * Get limitation count for a tier
   */
  getLimitationCount(tier: PricingTier): number {
    return tier.limitations ? tier.limitations.length : 0;
  }

  /**
   * Check if billing cycle has any pricing data
   */
  hasPricingForBilling(billing: BillingCycle): boolean {
    // Check Nexus Share
    if (this.nexusShare && this.getPricingForBilling(this.nexusShare.pricing, billing).length > 0) {
      return true;
    }

    // Check competitors
    return this.competitors.some((competitor) => this.getPricingForBilling(competitor.pricing, billing).length > 0);
  }

  /**
   * Get available billing cycles
   */
  getAvailableBillingCycles(): BillingCycle[] {
    const cycles: BillingCycle[] = [];

    if (this.hasPricingForBilling('monthly')) {
      cycles.push('monthly');
    }

    if (this.hasPricingForBilling('annual')) {
      cycles.push('annual');
    }

    return cycles;
  }

  /**
   * Track by function for competitor list to optimize rendering
   */
  trackByCompetitor(index: number, competitor: CompetitorData): string {
    return competitor.slug;
  }

  /**
   * Track by function for tier list to optimize rendering
   */
  trackByTier(index: number, tierName: string): string {
    return tierName;
  }

  /**
   * Track by function for pricing tier to optimize rendering
   */
  trackByPricingTier(index: number, tier: PricingTier): string {
    return `${tier.name}-${tier.billing}-${tier.price}`;
  }

  /**
   * Check if price is a number (not custom pricing)
   * Helper for template to check price type
   */
  isNumericPrice(price: number | 'Custom'): boolean {
    return typeof price === 'number';
  }
}

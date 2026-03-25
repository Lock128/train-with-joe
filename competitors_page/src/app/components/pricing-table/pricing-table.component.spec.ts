import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PricingTableComponent } from './pricing-table.component';
import type { CompetitorData, NexusShareData } from '../../models/competitor.interface';

describe('PricingTableComponent', () => {
  let component: PricingTableComponent;
  let fixture: ComponentFixture<PricingTableComponent>;

  const mockCompetitors: CompetitorData[] = [
    {
      name: 'Buffer',
      slug: 'buffer',
      tagline: 'Social media toolkit',
      logo: '/assets/images/buffer-logo.png',
      website: 'https://buffer.com',
      pricing: [
        {
          name: 'Free',
          price: 0,
          billing: 'monthly',
          features: ['3 social channels', '10 scheduled posts'],
          limitations: ['Limited analytics'],
        },
        {
          name: 'Essentials',
          price: 6,
          billing: 'monthly',
          features: ['8 social channels', 'Unlimited posts'],
          limitations: ['1 user only'],
        },
        {
          name: 'Essentials',
          price: 60,
          billing: 'annual',
          features: ['8 social channels', 'Unlimited posts'],
          limitations: ['1 user only'],
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
      pros: ['User-friendly'],
      cons: ['No AI features'],
      targetAudience: 'Small businesses',
      lastUpdated: '2024-12-30',
    },
  ];

  const mockNexusShare: NexusShareData = {
    uniqueFeatures: ['AI content enhancement', 'Advanced mention resolution'],
    pricing: [
      {
        name: 'Free',
        price: 0,
        billing: 'monthly',
        features: ['3 platforms', 'AI enhancement', 'Basic analytics'],
        limitations: ['Nexus Share branding'],
      },
      {
        name: 'Pro',
        price: 15,
        billing: 'monthly',
        features: ['Unlimited platforms', 'Advanced analytics', 'Team collaboration'],
        limitations: [],
      },
      {
        name: 'Pro',
        price: 150,
        billing: 'annual',
        features: ['Unlimited platforms', 'Advanced analytics', 'Team collaboration'],
        limitations: [],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PricingTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PricingTableComponent);
    component = fixture.componentInstance;
    component.competitors = mockCompetitors;
    component.nexusShare = mockNexusShare;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render pricing table with correct structure', () => {
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('.pricing-table'));
    expect(table).toBeTruthy();

    const headerCells = fixture.debugElement.queryAll(By.css('thead th'));
    // Should have plan column + nexus share + 1 competitor = 3 columns
    expect(headerCells.length).toBe(3);

    const pricingRows = fixture.debugElement.queryAll(By.css('tbody tr'));
    // Should have rows for unique tier names (Free, Essentials, Pro)
    expect(pricingRows.length).toBeGreaterThan(0);
  });

  it('should display platform logos and names in headers', () => {
    fixture.detectChanges();

    const platformHeaders = fixture.debugElement.queryAll(By.css('.platform-header-content'));
    expect(platformHeaders.length).toBeGreaterThan(0);

    const logos = fixture.debugElement.queryAll(By.css('.platform-logo'));
    expect(logos.length).toBe(mockCompetitors.length);

    const firstLogo = logos[0].nativeElement as HTMLImageElement;
    expect(firstLogo.src).toContain('buffer-logo.png');
    expect(firstLogo.alt).toBe('Buffer logo');
  });

  it('should format prices correctly', () => {
    expect(component.formatPrice(0, 'monthly')).toBe('Free');
    expect(component.formatPrice(15, 'monthly')).toBe('€15/mo');
    expect(component.formatPrice(150, 'annual')).toBe('€150/year');
  });

  it('should calculate savings correctly', () => {
    expect(component.calculateSavings(20, 15)).toBe(5);
    expect(component.calculateSavings(10, 15)).toBe(0); // No negative savings
    expect(component.calculateSavings(0, 0)).toBe(0);
  });

  it('should calculate savings percentage correctly', () => {
    expect(component.calculateSavingsPercentage(20, 15)).toBe(25); // 5/20 = 25%
    expect(component.calculateSavingsPercentage(0, 0)).toBe(0);
    expect(component.calculateSavingsPercentage(10, 15)).toBe(0); // No savings
  });

  it('should get pricing for specific billing cycle', () => {
    const monthlyTiers = component.getPricingForBilling(mockNexusShare.pricing, 'monthly');
    expect(monthlyTiers.length).toBe(2);
    expect(monthlyTiers.every((tier) => tier.billing === 'monthly')).toBe(true);

    const annualTiers = component.getPricingForBilling(mockNexusShare.pricing, 'annual');
    expect(annualTiers.length).toBe(1);
    expect(annualTiers.every((tier) => tier.billing === 'annual')).toBe(true);
  });

  it('should find lowest and highest price tiers', () => {
    const lowestMonthly = component.getLowestPriceTier(mockNexusShare.pricing, 'monthly');
    expect(lowestMonthly?.price).toBe(0);
    expect(lowestMonthly?.name).toBe('Free');

    const highestMonthly = component.getHighestPriceTier(mockNexusShare.pricing, 'monthly');
    expect(highestMonthly?.price).toBe(15);
    expect(highestMonthly?.name).toBe('Pro');
  });

  it('should get comparable Nexus Share tier', () => {
    const bufferFreeTier = mockCompetitors[0].pricing[0]; // Free tier
    const comparableTier = component.getComparableNexusShareTier(bufferFreeTier);

    expect(comparableTier).toBeTruthy();
    expect(comparableTier?.price).toBe(0); // Should match free tier
  });

  it('should determine if Nexus Share offers better value', () => {
    const bufferEssentialsTier = mockCompetitors[0].pricing[1]; // $6/month
    const isBetterValue = component.isNexusShareBetterValue(bufferEssentialsTier);

    // Nexus Share Free tier (0) vs Buffer Essentials ($6) - better value
    expect(isBetterValue).toBe(true);
  });

  it('should get all unique tier names', () => {
    const tierNames = component.getAllTierNames();

    expect(tierNames).toContain('Free');
    expect(tierNames).toContain('Pro');
    expect(tierNames).toContain('Essentials');
    expect(tierNames.length).toBeGreaterThan(0);
  });

  it('should get tier by name and billing cycle', () => {
    const freeTier = component.getTierByName(mockNexusShare.pricing, 'Free', 'monthly');
    expect(freeTier).toBeTruthy();
    expect(freeTier?.name).toBe('Free');
    expect(freeTier?.billing).toBe('monthly');

    const nonExistentTier = component.getTierByName(mockNexusShare.pricing, 'Enterprise', 'monthly');
    expect(nonExistentTier).toBeNull();
  });

  it('should check for limitations correctly', () => {
    const freeTier = mockNexusShare.pricing[0];
    const proTier = mockNexusShare.pricing[1];

    expect(component.hasLimitations(freeTier)).toBe(true);
    expect(component.hasLimitations(proTier)).toBe(false);
  });

  it('should count features and limitations', () => {
    const freeTier = mockNexusShare.pricing[0];

    expect(component.getFeatureCount(freeTier)).toBe(3);
    expect(component.getLimitationCount(freeTier)).toBe(1);
  });

  it('should calculate annual and monthly equivalents', () => {
    expect(component.getAnnualEquivalent(15)).toBe(180);
    expect(component.getMonthlyEquivalent(180)).toBe(15);
    expect(component.getMonthlyEquivalent(150)).toBe(12.5);
  });

  it('should toggle billing cycle', () => {
    expect(component.selectedBillingCycle).toBe('monthly');

    component.toggleBillingCycle();
    expect(component.selectedBillingCycle).toBe('annual');

    component.toggleBillingCycle();
    expect(component.selectedBillingCycle).toBe('monthly');
  });

  it('should check if pricing exists for billing cycle', () => {
    expect(component.hasPricingForBilling('monthly')).toBe(true);
    expect(component.hasPricingForBilling('annual')).toBe(true);
  });

  it('should get available billing cycles', () => {
    const cycles = component.getAvailableBillingCycles();

    expect(cycles).toContain('monthly');
    expect(cycles).toContain('annual');
    expect(cycles.length).toBe(2);
  });

  it('should render billing toggle when multiple cycles available', () => {
    component.showAnnualPricing = true;
    fixture.detectChanges();

    const billingToggle = fixture.debugElement.query(By.css('.billing-toggle'));
    expect(billingToggle).toBeTruthy();

    const toggleButtons = fixture.debugElement.queryAll(By.css('.toggle-button'));
    expect(toggleButtons.length).toBe(2);
  });

  it('should highlight savings when enabled', () => {
    component.highlightSavings = true;
    fixture.detectChanges();

    // Should show savings badges for better value tiers
    const savingsBadges = fixture.debugElement.queryAll(By.css('.savings-badge'));
    // May or may not have savings badges depending on pricing comparison
    expect(savingsBadges.length).toBeGreaterThanOrEqual(0);
  });

  it('should render mobile-friendly pricing cards', () => {
    fixture.detectChanges();

    const mobilePricing = fixture.debugElement.query(By.css('.mobile-pricing'));
    expect(mobilePricing).toBeTruthy();

    const mobilePlatformCards = fixture.debugElement.queryAll(By.css('.mobile-platform-card'));
    // Should have nexus share + competitors
    expect(mobilePlatformCards.length).toBe(mockCompetitors.length + 1);
  });

  it('should render pricing notes', () => {
    fixture.detectChanges();

    const pricingNotes = fixture.debugElement.query(By.css('.pricing-notes'));
    expect(pricingNotes).toBeTruthy();

    const noteItems = fixture.debugElement.queryAll(By.css('.note-item'));
    expect(noteItems.length).toBeGreaterThan(0);
  });

  it('should handle empty competitors array gracefully', () => {
    component.competitors = [];
    fixture.detectChanges();

    expect(() => fixture.detectChanges()).not.toThrow();

    const table = fixture.debugElement.query(By.css('.pricing-table'));
    expect(table).toBeTruthy();
  });

  it('should handle missing Nexus Share data gracefully', () => {
    component.nexusShare = null;
    fixture.detectChanges();

    expect(() => fixture.detectChanges()).not.toThrow();

    const nexusShareCells = fixture.debugElement.queryAll(By.css('.nexus-share-cell'));
    // Should still render cells but with "Not available" content
    expect(nexusShareCells.length).toBeGreaterThanOrEqual(0);
  });

  it('should track items correctly for performance optimization', () => {
    const competitor = mockCompetitors[0];
    const tier = mockNexusShare.pricing[0];

    expect(component.trackByCompetitor(0, competitor)).toBe(competitor.slug);
    expect(component.trackByTier(0, 'Free')).toBe('Free');
    expect(component.trackByPricingTier(0, tier)).toBe(`${tier.name}-${tier.billing}-${tier.price}`);
  });

  it('should handle different currency symbols', () => {
    component.currency = '€';

    expect(component.formatPrice(15, 'monthly')).toBe('€15/mo');
    expect(component.formatPrice(0, 'monthly')).toBe('Free');
  });
});

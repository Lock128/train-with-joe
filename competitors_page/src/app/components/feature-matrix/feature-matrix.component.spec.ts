import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import { describe, expect, beforeEach } from 'vitest';
import { FeatureMatrixComponent } from './feature-matrix.component';
import type { CompetitorData, TrainWithJoeData } from '../../models/competitor.interface';

describe('FeatureMatrixComponent', () => {
  let component: FeatureMatrixComponent;
  let fixture: ComponentFixture<FeatureMatrixComponent>;

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
          features: ['3 social channels'],
          limitations: ['Limited analytics'],
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
    {
      name: 'Hootsuite',
      slug: 'hootsuite',
      tagline: 'Social media management',
      logo: '/assets/images/hootsuite-logo.png',
      website: 'https://hootsuite.com',
      pricing: [
        {
          name: 'Professional',
          price: 99,
          billing: 'monthly',
          features: ['10 social profiles'],
          limitations: ['Limited team features'],
        },
      ],
      features: {
        multiPlatformPosting: 'full',
        aiContentGeneration: 'partial',
        scheduling: 'full',
        analytics: 'full',
        teamCollaboration: 'full',
        mentionResolution: 'partial',
        contentRecycling: 'partial',
        visualPlanning: 'full',
        socialListening: 'full',
      },
      pros: ['Comprehensive features'],
      cons: ['Expensive'],
      targetAudience: 'Enterprises',
      lastUpdated: '2024-12-30',
    },
  ];

  const mockTrainWithJoe: TrainWithJoeData = {
    uniqueFeatures: ['AI content enhancement', 'Advanced mention resolution'],
    pricing: [
      {
        name: 'Free',
        price: 0,
        billing: 'monthly',
        features: ['3 platforms', 'AI enhancement'],
        limitations: ['Train with Joe branding'],
      },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureMatrixComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FeatureMatrixComponent);
    component = fixture.componentInstance;
    component.competitors = mockCompetitors;
    component.trainWithJoe = mockTrainWithJoe;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render feature matrix table with correct structure', () => {
    fixture.detectChanges();

    const table = fixture.debugElement.query(By.css('.feature-matrix-table'));
    expect(table).toBeTruthy();

    const headerCells = fixture.debugElement.queryAll(By.css('thead th'));
    // Should have feature column + train with joe + 2 competitors = 4 columns
    expect(headerCells.length).toBe(4);

    const featureRows = fixture.debugElement.queryAll(By.css('tbody tr'));
    // Should have 9 feature rows (based on featureDefinitions)
    expect(featureRows.length).toBe(9);
  });

  it('should display competitor logos and names in headers', () => {
    fixture.detectChanges();

    const competitorHeaders = fixture.debugElement.queryAll(By.css('.competitor-header-content'));
    expect(competitorHeaders.length).toBeGreaterThan(0);

    const logos = fixture.debugElement.queryAll(By.css('.competitor-logo'));
    expect(logos.length).toBe(mockCompetitors.length);

    const firstLogo = logos[0].nativeElement as HTMLImageElement;
    expect(firstLogo.src).toContain('buffer-logo.png');
    expect(firstLogo.alt).toBe('Buffer logo');
  });

  it('should apply correct feature status classes', () => {
    fixture.detectChanges();

    const statusCells = fixture.debugElement.queryAll(By.css('.feature-status-cell'));
    expect(statusCells.length).toBeGreaterThan(0);

    // Check that status classes are applied
    const fullSupportCells = fixture.debugElement.queryAll(By.css('.feature-status-full'));
    const partialSupportCells = fixture.debugElement.queryAll(By.css('.feature-status-partial'));
    const noSupportCells = fixture.debugElement.queryAll(By.css('.feature-status-none'));
    const premiumCells = fixture.debugElement.queryAll(By.css('.feature-status-premium'));

    expect(
      fullSupportCells.length + partialSupportCells.length + noSupportCells.length + premiumCells.length,
    ).toBeGreaterThan(0);
  });

  it('should show correct feature status icons', () => {
    expect(component.getFeatureStatusIcon('full')).toBe('✓');
    expect(component.getFeatureStatusIcon('partial')).toBe('◐');
    expect(component.getFeatureStatusIcon('premium')).toBe('★');
    expect(component.getFeatureStatusIcon('none')).toBe('✗');
  });

  it('should provide correct accessibility labels', () => {
    expect(component.getFeatureStatusLabel('full')).toBe('Full support');
    expect(component.getFeatureStatusLabel('partial')).toBe('Partial support');
    expect(component.getFeatureStatusLabel('premium')).toBe('Premium feature');
    expect(component.getFeatureStatusLabel('none')).toBe('Not supported');
  });

  it('should highlight Train with Joe advantages', () => {
    fixture.detectChanges();

    // AI content generation should be a Train with Joe advantage
    expect(component.isTrainWithJoeAdvantage('aiContentGeneration')).toBe(true);

    // Mention resolution should be a Train with Joe advantage
    expect(component.isTrainWithJoeAdvantage('mentionResolution')).toBe(true);

    // Analytics should not be an advantage (we have partial, others have full)
    expect(component.isTrainWithJoeAdvantage('analytics')).toBe(false);
  });

  it('should show tooltips when enabled', () => {
    component.showTooltips = true;
    fixture.detectChanges();

    const tooltipTriggers = fixture.debugElement.queryAll(By.css('.tooltip-trigger'));
    expect(tooltipTriggers.length).toBe(component.featureDefinitions.length);

    // Test tooltip show/hide functionality
    const firstTrigger = tooltipTriggers[0];
    const mouseEvent = new MouseEvent('mouseenter');

    // Verify first trigger exists
    expect(firstTrigger).toBeDefined();

    component.showTooltip('multiPlatformPosting', mouseEvent);
    expect(component.activeTooltip).toBe('multiPlatformPosting');

    component.hideTooltip();
    // Note: hideTooltip uses setTimeout, so we need to test the timeout behavior
    expect(component.tooltipTimeout).toBeDefined();
  });

  it('should hide tooltips when disabled', () => {
    component.showTooltips = false;
    fixture.detectChanges();

    const tooltipTriggers = fixture.debugElement.queryAll(By.css('.tooltip-trigger'));
    expect(tooltipTriggers.length).toBe(0);
  });

  it('should render legend with all status types', () => {
    fixture.detectChanges();

    const legend = fixture.debugElement.query(By.css('.matrix-legend'));
    expect(legend).toBeTruthy();

    const legendItems = fixture.debugElement.queryAll(By.css('.legend-item'));
    expect(legendItems.length).toBe(4); // full, partial, premium, none

    const legendTexts = legendItems.map((item) => item.query(By.css('.legend-text')).nativeElement.textContent.trim());

    expect(legendTexts).toContain('Full Support');
    expect(legendTexts).toContain('Partial Support');
    expect(legendTexts).toContain('Premium Feature');
    expect(legendTexts).toContain('Not Supported');
  });

  it('should render mobile-friendly view', () => {
    fixture.detectChanges();

    const mobileMatrix = fixture.debugElement.query(By.css('.mobile-matrix'));
    expect(mobileMatrix).toBeTruthy();

    const mobileFeatureGroups = fixture.debugElement.queryAll(By.css('.mobile-feature-group'));
    expect(mobileFeatureGroups.length).toBe(component.featureDefinitions.length);

    const mobileCompetitors = fixture.debugElement.queryAll(By.css('.mobile-competitor'));
    // Should have train with joe + competitors for each feature
    expect(mobileCompetitors.length).toBeGreaterThan(0);
  });

  it('should handle empty competitors array gracefully', () => {
    component.competitors = [];
    fixture.detectChanges();

    expect(() => fixture.detectChanges()).not.toThrow();

    const table = fixture.debugElement.query(By.css('.feature-matrix-table'));
    expect(table).toBeTruthy();
  });

  it('should track competitors and features correctly', () => {
    const competitor = mockCompetitors[0];
    const feature = component.featureDefinitions[0];

    expect(component.trackByCompetitor(0, competitor)).toBe(competitor.slug);
    expect(component.trackByFeature(0, feature)).toBe(feature.key);
  });

  it('should get correct feature descriptions and display names', () => {
    const multiPlatformFeature = component.featureDefinitions.find((f) => f.key === 'multiPlatformPosting');

    expect(multiPlatformFeature).toBeTruthy();
    expect(component.getFeatureDescription('multiPlatformPosting')).toBe(multiPlatformFeature!.description);
    expect(component.getFeatureDisplayName('multiPlatformPosting')).toBe(multiPlatformFeature!.displayName);
  });

  it('should handle Train with Joe highlighting toggle', () => {
    // Initialize with some test data
    component.competitors = mockCompetitors;
    component.trainWithJoe = mockTrainWithJoe;

    // Test with highlighting enabled
    component.highlightTrainWithJoe = true;
    fixture.detectChanges();

    let trainWithJoeHeaders = fixture.debugElement.queryAll(By.css('.train-with-joe-header'));
    expect(trainWithJoeHeaders.length).toBe(1);

    // Test with highlighting disabled
    component.highlightTrainWithJoe = false;
    // Force change detection for OnPush strategy
    fixture.componentRef.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();

    trainWithJoeHeaders = fixture.debugElement.queryAll(By.css('.train-with-joe-header'));
    expect(trainWithJoeHeaders.length).toBe(0);
  });

  it('should apply nexus-advantage class to appropriate rows', () => {
    component.highlightTrainWithJoe = true;
    fixture.detectChanges();

    const advantageRows = fixture.debugElement.queryAll(By.css('.nexus-advantage'));
    expect(advantageRows.length).toBeGreaterThan(0);

    // Should highlight rows where Train with Joe has unique advantages
    // (aiContentGeneration and mentionResolution based on our mock data)
    expect(advantageRows.length).toBeGreaterThanOrEqual(2);
  });
});

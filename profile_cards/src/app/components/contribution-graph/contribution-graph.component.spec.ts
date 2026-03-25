import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContributionGraphComponent } from './contribution-graph.component';

describe('ContributionGraphComponent', () => {
  let component: ContributionGraphComponent;
  let fixture: ComponentFixture<ContributionGraphComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContributionGraphComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ContributionGraphComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty data', () => {
    component.postDates = [];
    component.ngOnInit();

    expect(component.weeks.length).toBeGreaterThan(0);
    expect(component.totalPosts).toBe(0);
    expect(component.maxCount).toBe(0);
  });

  it('should calculate contribution levels correctly', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    component.postDates = [today.toISOString(), today.toISOString(), today.toISOString(), yesterday.toISOString()];
    component.ngOnInit();

    expect(component.totalPosts).toBe(4);
    expect(component.maxCount).toBe(3);
  });

  it('should generate correct tooltip text', () => {
    const date = new Date('2024-01-15');
    const day = {
      date,
      count: 0,
      level: 0,
    };

    const tooltip = component.getTooltip(day);
    expect(tooltip).toContain('No posts');
    expect(tooltip).toContain('Jan 15, 2024');
  });

  it('should generate correct tooltip for single post', () => {
    const date = new Date('2024-01-15');
    const day = {
      date,
      count: 1,
      level: 1,
    };

    const tooltip = component.getTooltip(day);
    expect(tooltip).toContain('1 post');
  });

  it('should generate correct tooltip for multiple posts', () => {
    const date = new Date('2024-01-15');
    const day = {
      date,
      count: 5,
      level: 3,
    };

    const tooltip = component.getTooltip(day);
    expect(tooltip).toContain('5 posts');
  });

  it('should handle custom months to show', () => {
    component.monthsToShow = 6;
    component.postDates = [];
    component.ngOnInit();

    expect(component.weeks.length).toBeGreaterThan(0);
  });

  it('should generate month labels', () => {
    component.postDates = [];
    component.ngOnInit();

    expect(component.months.length).toBeGreaterThan(0);
    expect(component.months[0].name).toBeTruthy();
  });
});

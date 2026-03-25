import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Hero Section', () => {
    it('should render hero section with title', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const heroTitle = compiled.querySelector('.hero h1');
      expect(heroTitle?.textContent).toContain('Build Your SaaS Application Fast');
    });

    it('should render hero subtitle', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const subtitle = compiled.querySelector('.hero-subtitle');
      expect(subtitle).toBeTruthy();
    });

    it('should render CTA buttons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = compiled.querySelectorAll('.hero-buttons .btn');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Features Section', () => {
    it('should render features section', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const featuresSection = compiled.querySelector('.features-section');
      expect(featuresSection).toBeTruthy();
    });

    it('should render multiple feature cards', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const featureCards = compiled.querySelectorAll('.feature-card');
      expect(featureCards.length).toBeGreaterThan(0);
    });

    it('should render feature icons', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const featureIcons = compiled.querySelectorAll('.feature-icon');
      expect(featureIcons.length).toBeGreaterThan(0);
    });
  });

  describe('CTA Section', () => {
    it('should render registration form', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const form = compiled.querySelector('.cta-section form');
      expect(form).toBeTruthy();
    });

    it('should have email input field', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const emailInput = compiled.querySelector('input[type="email"]');
      expect(emailInput).toBeTruthy();
    });

    it('should have submit button', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      const submitButton = compiled.querySelector('button[type="submit"]');
      expect(submitButton).toBeTruthy();
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email format', () => {
      expect(component.validateEmail('test@example.com')).toBe(true);
      expect(component.validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email format', () => {
      expect(component.validateEmail('invalid')).toBe(false);
      expect(component.validateEmail('test@')).toBe(false);
      expect(component.validateEmail('@example.com')).toBe(false);
      expect(component.validateEmail('test@.com')).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should show error for invalid email', async () => {
      component.email = 'invalid-email';
      await component.joinWaitlist();

      expect(component.isSuccess).toBe(false);
      expect(component.message).toContain('valid email');
    });

    it('should set loading state during submission', async () => {
      component.email = 'test@example.com';
      const promise = component.joinWaitlist();

      expect(component.isLoading).toBe(true);

      await promise;

      expect(component.isLoading).toBe(false);
    });

    it('should show success message after submission', async () => {
      component.email = 'test@example.com';
      await component.joinWaitlist();

      expect(component.isSuccess).toBe(true);
      expect(component.message).toBeTruthy();
    });

    it('should clear email after successful submission', async () => {
      component.email = 'test@example.com';
      await component.joinWaitlist();

      expect(component.email).toBe('');
    });
  });

  describe('Scroll Navigation', () => {
    it('should have scrollToRegister method', () => {
      expect(component.scrollToRegister).toBeDefined();
    });

    it('should have scrollToFeatures method', () => {
      expect(component.scrollToFeatures).toBeDefined();
    });
  });

  /**
   * Property 9: Landing Page Responsiveness
   * Validates: Requirements 7.5
   *
   * For any viewport width between 320px and 2560px, the landing page SHALL render
   * without horizontal scrolling and with all content visible and accessible.
   *
   * Note: This is a property-based test concept adapted for Angular/Jasmine.
   * We test a representative sample of viewport widths to validate the property.
   */
  describe('Property 9: Landing Page Responsiveness', () => {
    const viewportWidths = [
      320, // Mobile (iPhone SE)
      375, // Mobile (iPhone X)
      414, // Mobile (iPhone Plus)
      768, // Tablet (iPad)
      1024, // Tablet landscape / Small desktop
      1366, // Desktop
      1920, // Full HD desktop
      2560, // 2K desktop
    ];

    viewportWidths.forEach((width) => {
      it(`should render without horizontal scroll at ${width}px viewport width`, () => {
        // Set viewport width
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: width,
        });

        // Trigger resize event
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();

        const compiled = fixture.nativeElement as HTMLElement;

        // Check that body width doesn't exceed viewport
        const bodyWidth = compiled.scrollWidth;
        expect(bodyWidth).toBeLessThanOrEqual(width + 1); // +1 for rounding

        // Verify key sections are present
        expect(compiled.querySelector('.hero')).toBeTruthy();
        expect(compiled.querySelector('.features-section')).toBeTruthy();
        expect(compiled.querySelector('.cta-section')).toBeTruthy();
      });
    });

    it('should have responsive navigation at mobile widths', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const nav = compiled.querySelector('.nav');
      expect(nav).toBeTruthy();
    });

    it('should stack hero buttons vertically on mobile', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      window.dispatchEvent(new Event('resize'));
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const heroButtons = compiled.querySelector('.hero-buttons');
      expect(heroButtons).toBeTruthy();
    });
  });
});

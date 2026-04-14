import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { TranslationService } from '../services/translation.service';
import { environment } from '../../environments/environment';

type FormStep = 'register' | 'verify';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  email = '';
  password = '';
  confirmPassword = '';
  verificationCode = '';
  isLoading = false;
  message = '';
  isSuccess = false;
  currentYear = new Date().getFullYear();
  step: FormStep = 'register';

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public i18n: TranslationService,
  ) {}

  async onRegister() {
    if (!this.validateEmail(this.email)) {
      this.showError(this.i18n.t('error.invalidEmail'));
      return;
    }
    if (this.password.length < 8) {
      this.showError(this.i18n.t('error.shortPassword'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.showError(this.i18n.t('error.passwordMismatch'));
      return;
    }

    this.isLoading = true;
    this.message = '';

    let confirmed: boolean | undefined;
    let signUpError: unknown;

    try {
      confirmed = await this.authService.signUp(this.email, this.password);
    } catch (error: unknown) {
      signUpError = error;
    }

    this.isLoading = false;
    if (signUpError) {
      this.showError(this.parseError(signUpError));
    } else if (confirmed) {
      this.signInAndRedirect();
    } else {
      this.step = 'verify';
      this.showSuccess(this.i18n.t('success.checkEmail'));
    }
    this.cdr.detectChanges();
  }

  async onVerify() {
    if (!this.verificationCode.trim()) {
      this.showError(this.i18n.t('error.enterCode'));
      return;
    }

    this.isLoading = true;
    this.message = '';

    let verifyError: unknown;

    try {
      await this.authService.confirmSignUp(this.email, this.verificationCode.trim());
    } catch (error: unknown) {
      verifyError = error;
    }

    this.isLoading = false;
    if (verifyError) {
      this.showError(this.parseError(verifyError));
    } else {
      this.showSuccess(this.i18n.t('success.verified'));
      this.signInAndRedirect();
    }
    this.cdr.detectChanges();
  }

  private signInAndRedirect() {
    const params = new URLSearchParams({
      email: this.email,
      registered: 'true',
    });
    window.location.href = `${environment.appUrl}/signin?${params.toString()}`;
  }

  private showError(msg: string) {
    this.isSuccess = false;
    this.message = msg;
  }

  private showSuccess(msg: string) {
    this.isSuccess = true;
    this.message = msg;
  }

  private parseError(error: unknown): string {
    const msg = error instanceof Error ? error.message : this.i18n.t('error.generic');
    if (msg.includes('UsernameExistsException')) return this.i18n.t('error.usernameExists');
    if (msg.includes('InvalidPasswordException')) return this.i18n.t('error.invalidPassword');
    if (msg.includes('CodeMismatchException')) return this.i18n.t('error.codeMismatch');
    if (msg.includes('ExpiredCodeException')) return this.i18n.t('error.expiredCode');
    if (msg.includes('LimitExceededException')) return this.i18n.t('error.limitExceeded');
    return msg;
  }

  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  scrollToRegister() {
    document.getElementById('register')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToFeatures() {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToPricing() {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  }
}

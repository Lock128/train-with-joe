import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
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
  ) {}

  async onRegister() {
    if (!this.validateEmail(this.email)) {
      this.showError('Please enter a valid email');
      return;
    }
    if (this.password.length < 8) {
      this.showError('Password must be at least 8 characters');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.showError('Passwords do not match');
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
      this.showSuccess('Check your email for a verification code.');
    }
    this.cdr.detectChanges();
  }

  async onVerify() {
    if (!this.verificationCode.trim()) {
      this.showError('Please enter the verification code');
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
      this.showSuccess('Email verified. Signing you in...');
      this.signInAndRedirect();
    }
    this.cdr.detectChanges();
  }

  private async signInAndRedirect() {
    try {
      const tokens = await this.authService.signIn(this.email, this.password);
      const params = new URLSearchParams({
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      window.location.href = `${environment.appUrl}/auth/callback?${params.toString()}`;
    } catch (error: unknown) {
      this.showError('Account created but auto-login failed. Redirecting to login...');
      this.cdr.detectChanges();
      setTimeout(() => {
        window.location.href = `${environment.appUrl}/login`;
      }, 2000);
    }
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
    const msg = error instanceof Error ? error.message : 'Something went wrong';
    if (msg.includes('UsernameExistsException')) return 'An account with this email already exists.';
    if (msg.includes('InvalidPasswordException'))
      return 'Password must include uppercase, lowercase, number, and symbol.';
    if (msg.includes('CodeMismatchException')) return 'Invalid verification code. Please try again.';
    if (msg.includes('ExpiredCodeException')) return 'Verification code expired. Please register again.';
    if (msg.includes('LimitExceededException')) return 'Too many attempts. Please try again later.';
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
}

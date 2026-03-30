import { Component } from '@angular/core';
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

  constructor(private authService: AuthService) {}

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

    try {
      const confirmed = await this.authService.signUp(this.email, this.password);
      if (confirmed) {
        // Auto-confirmed (unlikely with email verification enabled), sign in directly
        await this.signInAndRedirect();
      } else {
        this.step = 'verify';
        this.showSuccess('Check your email for a verification code.');
      }
    } catch (error: unknown) {
      this.showError(this.parseError(error));
    } finally {
      this.isLoading = false;
    }
  }

  async onVerify() {
    if (!this.verificationCode.trim()) {
      this.showError('Please enter the verification code');
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      await this.authService.confirmSignUp(this.email, this.verificationCode.trim());
      this.showSuccess('Email verified. Signing you in...');
      await this.signInAndRedirect();
    } catch (error: unknown) {
      this.showError(this.parseError(error));
    } finally {
      this.isLoading = false;
    }
  }

  private async signInAndRedirect() {
    try {
      const tokens = await this.authService.signIn(this.email, this.password);
      // Redirect to the app with tokens so it can auto-login
      const params = new URLSearchParams({
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
      window.location.href = `${environment.appUrl}/auth/callback?${params.toString()}`;
    } catch (error: unknown) {
      // Sign-in failed after registration — send them to the app login page
      this.showError('Account created but auto-login failed. Redirecting to login...');
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

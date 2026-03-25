import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  email = '';
  isLoading = false;
  message = '';
  isSuccess = false;
  currentYear = new Date().getFullYear();
  registerUrl = 'https://app.train-with-joe.com/register'; // Update with actual Flutter app URL

  async joinWaitlist() {
    if (!this.validateEmail(this.email)) {
      this.isSuccess = false;
      this.message = 'Please enter a valid email';
      return;
    }

    this.isLoading = true;
    this.message = '';

    try {
      // Placeholder for actual registration logic
      // In a real implementation, this would call your backend API
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.isSuccess = true;
      this.message = 'Thank you for your interest! Check your email for next steps.';
      this.email = '';
    } catch (error) {
      this.isSuccess = false;
      this.message = 'Failed to register. Please try again.';
    } finally {
      this.isLoading = false;
    }
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

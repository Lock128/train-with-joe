import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-nav-header',
  templateUrl: './nav-header.component.html',
  styleUrls: ['./nav-header.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class NavHeaderComponent {
  logoError = false;

  constructor(private router: Router) {}

  goToLeaderboard(): void {
    this.router.navigate(['/leaderboard']);
  }

  goToMainApp(): void {
    // This will be environment-specific
    window.open('https://nexus-share.com/join/', '_blank');
  }

  onLogoError(event: Event): void {
    this.logoError = true;
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { ProfileCardData } from '../../models/profile-card.model';

@Component({
  selector: 'app-metrics-display',
  templateUrl: './metrics-display.component.html',
  styleUrls: ['./metrics-display.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class MetricsDisplayComponent {
  @Input() metrics!: ProfileCardData['metrics'];
  @Input() rankings!: ProfileCardData['rankings'];
}

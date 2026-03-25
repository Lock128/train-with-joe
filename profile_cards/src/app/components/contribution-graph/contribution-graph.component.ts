import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ContributionDay {
  date: Date;
  count: number;
  level: number; // 0-4 for color intensity
}

interface ContributionWeek {
  days: ContributionDay[];
}

interface ContributionMonth {
  name: string;
  startWeek: number;
  weeks: number;
}

@Component({
  selector: 'app-contribution-graph',
  templateUrl: './contribution-graph.component.html',
  styleUrls: ['./contribution-graph.component.css'],
  standalone: true,
  imports: [CommonModule],
})
export class ContributionGraphComponent implements OnInit {
  @Input() postDates: string[] = []; // Array of ISO date strings when posts were published
  @Input() monthsToShow: number = 12; // Number of months to display

  weeks: ContributionWeek[] = [];
  months: ContributionMonth[] = [];
  maxCount: number = 0;
  totalPosts: number = 0;

  ngOnInit(): void {
    this.generateContributionData();
  }

  private generateContributionData(): void {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - this.monthsToShow);

    // Start from Sunday of the week containing startDate
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // Count posts by date
    const postCountByDate = new Map<string, number>();
    this.postDates.forEach((dateStr) => {
      const date = new Date(dateStr);
      const dateKey = this.getDateKey(date);
      postCountByDate.set(dateKey, (postCountByDate.get(dateKey) || 0) + 1);
    });

    this.maxCount = Math.max(...Array.from(postCountByDate.values()), 0);
    this.totalPosts = this.postDates.length;

    // Generate weeks and days
    const currentDate = new Date(startDate);
    const weeks: ContributionWeek[] = [];

    while (currentDate <= today) {
      const week: ContributionDay[] = [];

      for (let i = 0; i < 7; i++) {
        const dateKey = this.getDateKey(currentDate);
        const count = postCountByDate.get(dateKey) || 0;
        const level = this.getContributionLevel(count);

        week.push({
          date: new Date(currentDate),
          count,
          level,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push({ days: week });
    }

    this.weeks = weeks;
    this.generateMonthLabels(startDate, today);
  }

  private generateMonthLabels(startDate: Date, _endDate: Date): void {
    const months: ContributionMonth[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let currentMonth = startDate.getMonth();
    let currentYear = startDate.getFullYear();

    for (let i = 0; i < this.weeks.length; i++) {
      const firstDay = this.weeks[i].days[0];
      const month = firstDay.date.getMonth();
      const year = firstDay.date.getFullYear();

      if (month !== currentMonth || year !== currentYear) {
        months.push({
          name: monthNames[month],
          startWeek: i,
          weeks: 1,
        });
        currentMonth = month;
        currentYear = year;
      } else if (months.length > 0) {
        months[months.length - 1].weeks++;
      } else {
        months.push({
          name: monthNames[month],
          startWeek: i,
          weeks: 1,
        });
      }
    }

    this.months = months;
  }

  private getDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getContributionLevel(count: number): number {
    if (count === 0) return 0;
    if (this.maxCount === 0) return 0;

    const percentage = count / this.maxCount;
    if (percentage >= 0.75) return 4;
    if (percentage >= 0.5) return 3;
    if (percentage >= 0.25) return 2;
    return 1;
  }

  getTooltip(day: ContributionDay): string {
    const dateStr = day.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (day.count === 0) {
      return `No posts on ${dateStr}`;
    } else if (day.count === 1) {
      return `1 post on ${dateStr}`;
    } else {
      return `${day.count} posts on ${dateStr}`;
    }
  }

  getDayName(index: number): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[index];
  }
}

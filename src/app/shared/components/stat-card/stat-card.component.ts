import {Component, computed, input} from '@angular/core';
import {CurrencyPipe} from '@angular/common';
import {categoryColor} from '../../../core/models/finance.model';

@Component({
  selector: 'app-stat-card',
  imports: [CurrencyPipe],
  templateUrl: './stat-card.component.html',
})
export class StatCardComponent {
  readonly title = input<string>('');
  readonly amount = input<number>(0);
  readonly color = input<string>('indigo');
  readonly goal = input<number | undefined>();
  readonly subtext = input<string | undefined>();

  readonly palette = computed(() => categoryColor(this.color()));

  readonly goalPercentage = computed(() => {
    const goal = this.goal();
    const amount = this.amount();
    if (goal === undefined || goal <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((amount / goal) * 100)));
  });
}

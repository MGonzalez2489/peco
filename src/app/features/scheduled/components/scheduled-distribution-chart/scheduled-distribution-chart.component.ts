import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, input, output} from '@angular/core';
import {DistributionChartItem} from '@core/models';
import {ScheduledDistributionLegendComponent} from '../scheduled-distribution-legend/scheduled-distribution-legend.component';

@Component({
  selector: 'app-scheduled-distribution-chart',
  imports: [CurrencyPipe, ScheduledDistributionLegendComponent],
  templateUrl: './scheduled-distribution-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledDistributionChartComponent {
  readonly distributionData = input.required<DistributionChartItem[]>();
  readonly totalAmount = input.required<number>();
  readonly availableAmount = input(0);
  readonly type = input<'expense' | 'income'>('expense');
  readonly selectedCategoryId = input<string | null>(null);

  readonly categorySelected = output<string>();
  readonly clearSelection = output<void>();

  protected readonly emptyStateLabel = computed(() =>
    this.type() === 'income' ? 'ingresos' : 'egresos',
  );

  protected readonly showAvailable = computed(() => this.availableAmount() > 0);

  protected readonly barTotal = computed(
    () => Math.max(0, this.totalAmount()) + Math.max(0, this.availableAmount()),
  );

  protected readonly barSegments = computed(() => {
    const total = this.barTotal();
    return this.distributionData().map((item) => ({
      ...item,
      percentage: total > 0 ? (item.amount / total) * 100 : 0,
    }));
  });

  protected readonly availablePercentage = computed(() => {
    const total = this.barTotal();
    return total > 0 ? (Math.max(0, this.availableAmount()) / total) * 100 : 0;
  });

  protected readonly availablePercentageLabel = computed(() =>
    Math.round(this.availablePercentage()),
  );

  protected readonly donutSegments = computed(() => {
    const items = this.distributionData();
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const circumference = 2 * Math.PI * 45;
    let offset = 0;

    return items.map((item) => {
      const percent = total > 0 ? (item.amount / total) * 100 : 0;
      const dash = (percent / 100) * circumference;
      const segment = {
        ...item,
        dash,
        offset: circumference - (offset / 100) * circumference,
      };
      offset += percent;
      return segment;
    });
  });

  protected onSegmentKeydown(event: KeyboardEvent, categoryId: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    this.categorySelected.emit(categoryId);
  }
}

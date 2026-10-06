import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {CategoryDistributionItem} from '@core/stores/scheduled-transactions.store';

@Component({
  selector: 'app-scheduled-distribution-legend',
  imports: [CurrencyPipe],
  templateUrl: './scheduled-distribution-legend.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledDistributionLegendComponent {
  readonly items = input<CategoryDistributionItem[]>([]);
  readonly selectedCategoryId = input<string | null>(null);

  readonly categorySelected = output<string>();
  readonly clearSelection = output<void>();
}

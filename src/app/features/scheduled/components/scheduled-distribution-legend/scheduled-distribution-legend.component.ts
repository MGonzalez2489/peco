import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {DistributionChartItem} from '@core/models';

@Component({
  selector: 'app-scheduled-distribution-legend',
  imports: [CurrencyPipe],
  templateUrl: './scheduled-distribution-legend.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledDistributionLegendComponent {
  readonly items = input<DistributionChartItem[]>([]);
  readonly selectedCategoryId = input<string | null>(null);

  readonly categorySelected = output<string>();
  readonly clearSelection = output<void>();
}

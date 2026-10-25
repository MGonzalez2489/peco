import {ChangeDetectionStrategy, Component, input, output} from '@angular/core';
import {DistributionChartItem} from '@core/models';
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';

@Component({
  selector: 'app-scheduled-distribution-legend',
  imports: [PrivacyCurrencyPipe],
  templateUrl: './scheduled-distribution-legend.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduledDistributionLegendComponent {
  readonly items = input<DistributionChartItem[]>([]);
  readonly selectedCategoryId = input<string | null>(null);

  readonly categorySelected = output<string>();
  readonly clearSelection = output<void>();
}

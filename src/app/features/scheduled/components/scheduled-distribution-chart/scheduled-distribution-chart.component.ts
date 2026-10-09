import {CurrencyPipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, input, output} from '@angular/core';
import {DistributionChartItem} from '@core/models';
import {ThemeService} from '@core/services/theme.service';
import {formatCurrency, toSoftCategoryColor} from '@core/utils';
import {AppIconComponent} from '@shared/components/app-icon/app-icon.component';
import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTheme,
  ApexTooltip,
  NgApexchartsModule,
} from 'ng-apexcharts';
import {ScheduledDistributionLegendComponent} from '../scheduled-distribution-legend/scheduled-distribution-legend.component';

interface ChartSlice extends DistributionChartItem {
  isAvailable: boolean;
}

@Component({
  selector: 'app-scheduled-distribution-chart',
  imports: [
    CurrencyPipe,
    NgApexchartsModule,
    AppIconComponent,
    ScheduledDistributionLegendComponent,
  ],
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

  private readonly themeService = inject(ThemeService);

  private static readonly AVAILABLE_CATEGORY_ID = '__available__';
  private static readonly AVAILABLE_COLOR = '#cbd5e1';

  protected readonly emptyStateLabel = computed(() =>
    this.type() === 'income' ? 'ingresos' : 'egresos',
  );

  protected readonly hasData = computed(() => this.distributionData().length > 0);

  protected readonly categoryCountLabel = computed(() =>
    this.distributionData().length === 1
      ? '1 categoría'
      : `${this.distributionData().length} categorías`,
  );

  protected readonly showAvailable = computed(() => this.availableAmount() > 0);

  protected readonly ariaLabel = computed(
    () =>
      `Distribución de ${this.emptyStateLabel()} programados por categoría. Total ${formatCurrency(
        this.totalAmount(),
      )}.`,
  );

  protected readonly grandTotal = computed(
    () => this.totalAmount() + Math.max(0, this.availableAmount()),
  );

  protected readonly availablePercentage = computed(() => {
    const total = this.grandTotal();
    return total > 0 ? Math.round((Math.max(0, this.availableAmount()) / total) * 100) : 0;
  });

  protected readonly legendItems = computed<DistributionChartItem[]>(() => {
    const total = this.grandTotal();
    return this.distributionData().map((item) => ({
      ...item,
      percentage: total > 0 ? Math.round((item.amount / total) * 100) : 0,
    }));
  });

  protected readonly chartSlices = computed<ChartSlice[]>(() => {
    const slices: ChartSlice[] = this.distributionData().map((item) => ({
      ...item,
      isAvailable: false,
    }));

    if (this.showAvailable()) {
      slices.push({
        categoryId: ScheduledDistributionChartComponent.AVAILABLE_CATEGORY_ID,
        categoryName: 'Disponible',
        color: ScheduledDistributionChartComponent.AVAILABLE_COLOR,
        amount: this.availableAmount(),
        percentage: this.availablePercentage(),
        isAvailable: true,
      });
    }

    return slices;
  });

  protected readonly series = computed<ApexNonAxisChartSeries>(() =>
    this.chartSlices().map((slice) => slice.amount),
  );

  protected readonly labels = computed(() => this.chartSlices().map((slice) => slice.categoryName));

  protected readonly colors = computed(() => {
    const selected = this.selectedCategoryId();
    return this.chartSlices().map((slice) => {
      if (!selected || slice.isAvailable || slice.categoryId === selected) return slice.color;
      return toSoftCategoryColor(slice.color, '33');
    });
  });

  protected readonly chart = computed<ApexChart>(() => ({
    type: 'donut',
    height: 260,
    fontFamily: 'inherit',
    background: 'transparent',
    animations: {
      enabled: true,
      speed: 400,
      dynamicAnimation: {enabled: true, speed: 350},
    },
    events: {
      dataPointSelection: (_event, _chart, options) => {
        const slice = options ? this.chartSlices()[options.dataPointIndex] : undefined;
        if (slice && !slice.isAvailable) this.categorySelected.emit(slice.categoryId);
      },
    },
  }));

  protected readonly plotOptions = computed<ApexPlotOptions>(() => ({
    pie: {
      expandOnClick: false,
      donut: {
        size: '72%',
        labels: {show: false},
      },
    },
  }));

  protected readonly dataLabels = computed<ApexDataLabels>(() => ({enabled: false}));

  protected readonly legend = computed<ApexLegend>(() => ({show: false}));

  protected readonly stroke = computed<ApexStroke>(() => ({show: false, width: 0}));

  protected readonly theme = computed<ApexTheme>(() => ({
    mode: this.themeService.isDark() ? 'dark' : 'light',
  }));

  protected readonly tooltip = computed<ApexTooltip>(() => ({
    theme: this.themeService.isDark() ? 'dark' : 'light',
    y: {
      formatter: (value: number) => this.tooltipValue(value),
    },
  }));

  private tooltipValue(value: number): string {
    const total = this.chartSlices().reduce((sum, slice) => sum + slice.amount, 0);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return `${formatCurrency(value)} · ${percentage}%`;
  }
}

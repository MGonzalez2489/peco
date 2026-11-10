import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {ThemeService} from '@core/services/theme.service';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {formatCentsToCurrency} from '@core/utils';
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
import {PrivacyCurrencyPipe} from '@shared/pipes/privacy-currency.pipe';

/**
 * Income versus expense donut for the active global period. Past periods feed
 * it with frozen snapshot totals; current and future periods with live data.
 */
@Component({
  selector: 'app-period-flow-chart',
  imports: [NgApexchartsModule, PrivacyCurrencyPipe],
  templateUrl: './period-flow-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PeriodFlowChartComponent {
  readonly periodLabel = input.required<string>();
  readonly inflows = input.required<number>();
  readonly outflows = input.required<number>();

  private readonly themeService = inject(ThemeService);
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  protected readonly hasData = computed(() => this.inflows() + this.outflows() > 0);

  protected readonly netBalance = computed(() => this.inflows() - this.outflows());

  protected readonly ariaLabel = computed(() => {
    const format = (value: number): string =>
      this.userPreferencesStore.hideBalance() ? '--.--' : formatCentsToCurrency(value);

    return `Ingresos y egresos de ${this.periodLabel()}. Ingresos ${format(
      this.inflows(),
    )}, egresos ${format(this.outflows())}.`;
  });

  protected readonly series = computed<ApexNonAxisChartSeries>(() => [
    this.inflows(),
    this.outflows(),
  ]);

  protected readonly labels = ['Ingresos', 'Egresos'];

  protected readonly colors = ['#10b981', '#f43f5e'];

  protected readonly chart = computed<ApexChart>(() => ({
    type: 'donut',
    height: 210,
    fontFamily: 'inherit',
    background: 'transparent',
    toolbar: {show: false},
  }));

  protected readonly plotOptions = computed<ApexPlotOptions>(() => ({
    pie: {
      donut: {
        size: '68%',
        labels: {
          show: true,
          name: {
            show: true,
            fontSize: '11px',
            color: '#94a3b8',
          },
          value: {
            show: true,
            fontSize: '16px',
            fontWeight: 700,
            color: this.themeService.isDark() ? '#f1f5f9' : '#0f172a',
            formatter: (value: string) =>
              this.userPreferencesStore.hideBalance()
                ? '--.--'
                : formatCentsToCurrency(Number(value)),
          },
          total: {
            show: true,
            label: 'Balance',
            fontSize: '11px',
            color: '#94a3b8',
            formatter: () =>
              this.userPreferencesStore.hideBalance()
                ? '--.--'
                : formatCentsToCurrency(this.netBalance()),
          },
        },
      },
    },
  }));

  protected readonly dataLabels = computed<ApexDataLabels>(() => ({enabled: false}));

  protected readonly stroke = computed<ApexStroke>(() => ({width: 0}));

  protected readonly legend = computed<ApexLegend>(() => ({
    show: true,
    position: 'bottom',
    fontSize: '12px',
    fontWeight: 600,
    labels: {colors: this.themeService.isDark() ? '#cbd5e1' : '#475569'},
    markers: {size: 6},
    itemMargin: {horizontal: 10, vertical: 2},
  }));

  protected readonly theme = computed<ApexTheme>(() => ({
    mode: this.themeService.isDark() ? 'dark' : 'light',
  }));

  protected readonly tooltip = computed<ApexTooltip>(() => ({
    theme: this.themeService.isDark() ? 'dark' : 'light',
    y: {
      formatter: (value: number) =>
        this.userPreferencesStore.hideBalance() ? '--.--' : formatCentsToCurrency(value),
    },
  }));
}

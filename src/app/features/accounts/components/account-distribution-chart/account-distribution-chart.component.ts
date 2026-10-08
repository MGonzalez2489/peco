import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {Account} from '@core/models';
import {ThemeService} from '@core/services/theme.service';
import {accountColor, formatCurrency} from '@core/utils';
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

@Component({
  selector: 'app-account-distribution-chart',
  imports: [NgApexchartsModule, AppIconComponent],
  templateUrl: './account-distribution-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDistributionChartComponent {
  readonly accounts = input.required<Account[]>();
  readonly totalBalance = input.required<number>();

  private readonly themeService = inject(ThemeService);

  protected readonly chartAccounts = computed(() =>
    this.accounts().filter((account) => account.currentBalance > 0),
  );

  protected readonly hasData = computed(() => this.chartAccounts().length > 0);

  protected readonly accountCount = computed(() => this.accounts().length);

  protected readonly ariaLabel = computed(
    () =>
      `Distribución de saldo entre ${this.chartAccounts().length} cuentas. Total ${formatCurrency(
        this.totalBalance(),
      )}.`,
  );

  protected readonly series = computed<ApexNonAxisChartSeries>(() =>
    this.chartAccounts().map((account) => account.currentBalance),
  );

  protected readonly labels = computed(() => this.chartAccounts().map((account) => account.name));

  protected readonly colors = computed(() =>
    this.chartAccounts().map((account) => accountColor(account.color).chip),
  );

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

  protected readonly formatCurrency = formatCurrency;

  private tooltipValue(value: number): string {
    const total = this.chartAccounts().reduce((sum, account) => sum + account.currentBalance, 0);
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    return `${formatCurrency(value)} · ${percentage}%`;
  }
}

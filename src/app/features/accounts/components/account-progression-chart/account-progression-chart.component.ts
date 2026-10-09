import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {Account, Movement} from '@core/models';
import {ThemeService} from '@core/services/theme.service';
import {accountColor, formatCurrency, formatShortDate, todayIsoDate} from '@core/utils';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexMarkers,
  ApexStroke,
  ApexTheme,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';

interface BalanceProgressionPoint {
  date: string;
  value: number;
}

@Component({
  selector: 'app-account-progression-chart',
  imports: [NgApexchartsModule],
  templateUrl: './account-progression-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountProgressionChartComponent {
  readonly account = input.required<Account>();
  readonly movements = input.required<Movement[]>();

  private readonly themeService = inject(ThemeService);

  protected readonly chartColor = computed(() => {
    const account = this.account();
    if (account.color) return accountColor(account.color).chip;
    return account.currentBalance < 0 ? '#ef4444' : '#10b981';
  });

  protected readonly ariaLabel = computed(
    () =>
      `Evolución del saldo de ${this.account().name}. Saldo actual ${formatCurrency(
        this.account().currentBalance,
      )}.`,
  );

  protected readonly progression = computed<BalanceProgressionPoint[]>(() => {
    const {id: accountId, currentBalance} = this.account();
    const relevant = this.movements()
      .filter(
        (movement) =>
          !movement.isCanceled &&
          (movement.accountId === accountId || movement.targetAccountId === accountId),
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    if (relevant.length === 0) {
      const today = todayIsoDate();
      return [
        {date: this.previousDay(today), value: currentBalance},
        {date: today, value: currentBalance},
      ];
    }

    const netTotal = relevant.reduce(
      (sum, movement) => sum + this.balanceImpact(movement, accountId),
      0,
    );
    const startingBalance = currentBalance - netTotal;

    const dailyNet = new Map<string, number>();
    for (const movement of relevant) {
      const day = movement.date.slice(0, 10);
      const impact = this.balanceImpact(movement, accountId);
      dailyNet.set(day, (dailyNet.get(day) ?? 0) + impact);
    }

    const days = [...dailyNet.keys()].sort();
    const points: BalanceProgressionPoint[] = [
      {date: this.previousDay(days[0]), value: startingBalance},
    ];

    let balance = startingBalance;
    for (const day of days) {
      balance += dailyNet.get(day) ?? 0;
      points.push({date: day, value: balance});
    }

    return points;
  });

  protected readonly series = computed<ApexAxisChartSeries>(() => [
    {name: 'Saldo', data: this.progression().map((point) => point.value)},
  ]);

  protected readonly categories = computed(() =>
    this.progression().map((point) => formatShortDate(point.date)),
  );

  protected readonly colors = computed(() => [this.chartColor()]);

  protected readonly chart = computed<ApexChart>(() => ({
    type: 'area',
    height: 220,
    fontFamily: 'inherit',
    background: 'transparent',
    toolbar: {show: false},
    zoom: {enabled: false},
    sparkline: {enabled: false},
    animations: {
      enabled: true,
      speed: 400,
      dynamicAnimation: {enabled: true, speed: 350},
    },
  }));

  protected readonly stroke = computed<ApexStroke>(() => ({curve: 'straight', width: 2.5}));

  protected readonly markers = computed<ApexMarkers>(() => ({
    size: 4,
    colors: [this.chartColor()],
    strokeColors: '#ffffff',
    strokeWidth: 2,
    hover: {size: 6},
  }));

  protected readonly fill = computed<ApexFill>(() => ({
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.45,
      opacityTo: 0,
      stops: [0, 90, 100],
    },
  }));

  protected readonly grid = computed<ApexGrid>(() => ({
    borderColor: '#f1f5f9',
    strokeDashArray: 4,
    padding: {left: 0, right: 0},
    xaxis: {lines: {show: false}},
    yaxis: {lines: {show: true}},
  }));

  protected readonly xaxis = computed<ApexXAxis>(() => ({
    type: 'category',
    categories: this.categories(),
    axisBorder: {show: false},
    axisTicks: {show: false},
    tooltip: {enabled: false},
    labels: {
      style: {colors: '#94a3b8', fontSize: '11px'},
      hideOverlappingLabels: true,
    },
  }));

  protected readonly yaxis = computed<ApexYAxis>(() => {
    const values = this.progression().map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    const padding = span === 0 ? Math.max(Math.abs(max) * 0.1, 1) : span * 0.15;

    return {
      show: false,
      min: min - padding,
      max: max + padding,
    };
  });

  protected readonly dataLabels = computed<ApexDataLabels>(() => ({enabled: false}));

  protected readonly theme = computed<ApexTheme>(() => ({
    mode: this.themeService.isDark() ? 'dark' : 'light',
  }));

  protected readonly tooltip = computed<ApexTooltip>(() => ({
    theme: this.themeService.isDark() ? 'dark' : 'light',
    y: {formatter: (value: number) => formatCurrency(value)},
  }));

  private balanceImpact(movement: Movement, accountId: string): number {
    if (movement.isCanceled) return 0;

    switch (movement.type) {
      case 'INCOME':
        return movement.accountId === accountId ? movement.amount : 0;
      case 'EXPENSE':
        return movement.accountId === accountId ? -movement.amount : 0;
      case 'TRANSFER':
        if (movement.accountId === accountId) return -movement.amount;
        if (movement.targetAccountId === accountId) return movement.amount;
        return 0;
    }
  }

  private previousDay(isoDay: string): string {
    const [year, month, day] = isoDay.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }
}

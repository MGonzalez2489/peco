import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {Account, Movement} from '@core/models';
import {ThemeService} from '@core/services/theme.service';
import {accountColor, formatCurrency, formatShortDate} from '@core/utils';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexMarkers,
  ApexPlotOptions,
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

interface Period {
  month: number;
  year: number;
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
  readonly period = input<Period>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

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
    const period = this.period();
    const relevant = this.movements().filter(
      (movement) =>
        !movement.isCanceled &&
        (movement.accountId === accountId || movement.targetAccountId === accountId),
    );

    const impact = (movement: Movement): number => this.balanceImpact(movement, accountId);

    const afterImpact = relevant
      .filter((movement) => this.isAfterPeriod(movement.date, period))
      .reduce((sum, movement) => sum + impact(movement), 0);
    const periodImpact = relevant
      .filter((movement) => this.isInPeriod(movement.date, period))
      .reduce((sum, movement) => sum + impact(movement), 0);

    const endingBalance = currentBalance - afterImpact;
    const startingBalance = endingBalance - periodImpact;

    const dailyNet = new Map<string, number>();
    for (const movement of relevant) {
      if (!this.isInPeriod(movement.date, period)) continue;
      const day = movement.date.slice(0, 10);
      dailyNet.set(day, (dailyNet.get(day) ?? 0) + impact(movement));
    }

    const firstDay = this.firstDayOfPeriod(period);
    const lastDay = this.lastVisibleDayOfPeriod(period);
    const points: BalanceProgressionPoint[] = [
      {date: this.previousDay(firstDay), value: startingBalance},
    ];

    let balance = startingBalance;
    for (const day of this.daysBetween(firstDay, lastDay)) {
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
      opacityFrom: 0.4,
      opacityTo: 0,
      stops: [0, 90, 100],
    },
  }));

  protected readonly plotOptions = computed<ApexPlotOptions>(() => ({
    area: {
      fillTo: 'end',
    },
  }));

  protected readonly grid = computed<ApexGrid>(() => ({
    borderColor: '#f1f5f9',
    strokeDashArray: 4,
    padding: {left: 0, right: 0, top: 10, bottom: 0},
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
    const padding = span === 0 ? Math.max(Math.abs(max) * 0.1, 1) : span * 0.1;

    return {
      show: true,
      tickAmount: 2,
      min: min - padding,
      max: max + padding,
      labels: {
        formatter: (value: number) => this.shortCurrency(value),
        style: {colors: '#94a3b8', fontSize: '11px'},
      },
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

  private isInPeriod(isoDate: string, period: Period): boolean {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMonth() + 1 === period.month && date.getFullYear() === period.year;
  }

  private isAfterPeriod(isoDate: string, period: Period): boolean {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return false;
    const value = date.getFullYear() * 12 + (date.getMonth() + 1);
    const boundary = period.year * 12 + period.month;
    return value > boundary;
  }

  private firstDayOfPeriod(period: Period): string {
    return this.toIsoDay(new Date(period.year, period.month - 1, 1));
  }

  private lastVisibleDayOfPeriod(period: Period): string {
    const lastDay = new Date(period.year, period.month, 0);
    const today = new Date();
    const isCurrentOrFuture =
      period.year > today.getFullYear() ||
      (period.year === today.getFullYear() && period.month >= today.getMonth() + 1);
    return this.toIsoDay(isCurrentOrFuture ? today : lastDay);
  }

  private daysBetween(startIsoDay: string, endIsoDay: string): string[] {
    const days: string[] = [];
    const [startYear, startMonth, startDay] = startIsoDay.split('-').map(Number);
    const end = new Date(endIsoDay);
    const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));

    while (cursor.getTime() <= end.getTime()) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }

  private toIsoDay(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private shortCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private previousDay(isoDay: string): string {
    const [year, month, day] = isoDay.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
  }
}

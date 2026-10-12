import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {Movement, ProgressionPoint} from '@core/models';
import {ThemeService} from '@core/services/theme.service';
import {calculateMovementProgression, formatCurrency} from '@core/utils';
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

interface Period {
  month: number;
  year: number;
}

@Component({
  selector: 'app-movements-progression-chart',
  imports: [NgApexchartsModule],
  templateUrl: './movements-progression-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovementsProgressionChartComponent {
  readonly movements = input.required<Movement[]>();
  readonly period = input<Period>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  private readonly themeService = inject(ThemeService);

  protected readonly progression = computed<ProgressionPoint[]>(() => {
    const {month, year} = this.period();
    return calculateMovementProgression(this.movements(), year, month);
  });

  protected readonly isGrowing = computed(() => {
    const points = this.progression();
    if (points.length < 2) return false;
    return points[points.length - 1].y >= points[0].y;
  });

  protected readonly chartColor = computed(() => (this.isGrowing() ? '#10b981' : '#ef4444'));

  protected readonly ariaLabel = computed(() => {
    const points = this.progression();
    const net = points.length > 0 ? points[points.length - 1].y : 0;
    return `Progresión de ingresos y egresos del período. Balance ${formatCurrency(net)}.`;
  });

  protected readonly series = computed<ApexAxisChartSeries>(() => [
    {name: 'Balance', data: this.progression().map((point) => point.y)},
  ]);

  protected readonly categories = computed(() => this.progression().map((point) => point.x));

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
    const values = this.progression().map((point) => point.y);
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

  private shortCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
}

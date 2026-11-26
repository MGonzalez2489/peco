import {Injectable} from '@nestjs/common';
import {MetricTypeEnum} from '@peco/enums';

export type MetricLabels = Readonly<Record<string, string>>;

type MetricFamily = {
  readonly help: string;
  readonly type: string;
};

type ScalarSeries = {
  readonly labels: MetricLabels;
  value: number;
};

type HistogramSeries = {
  readonly labels: MetricLabels;
  readonly buckets: Map<number, number>;
  sum: number;
  count: number;
};

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

const escapeLabelValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

const seriesKey = (labels: MetricLabels): string =>
  Object.keys(labels)
    .sort()
    .map((key) => `${key}=${labels[key]}`)
    .join(',');

const renderLabels = (labels: MetricLabels): string => {
  const entries = Object.keys(labels)
    .sort()
    .map((key) => `${key}="${escapeLabelValue(labels[key])}"`);
  return entries.length > 0 ? `{${entries.join(',')}}` : '';
};

/**
 * Small in-memory Prometheus registry. It intentionally has no external
 * dependency: v1 needs a scrapeable text endpoint, not remote aggregation
 * (13.2/US-1002). Every series is keyed by a canonicalized label set.
 */
@Injectable()
export class MetricsRegistry {
  private readonly families = new Map<string, MetricFamily>();
  private readonly counters = new Map<string, Map<string, ScalarSeries>>();
  private readonly gauges = new Map<string, Map<string, ScalarSeries>>();
  private readonly histograms = new Map<string, Map<string, HistogramSeries>>();

  register(name: string, help: string, type: string): void {
    const existing = this.families.get(name);
    if (existing && existing.type !== type) {
      throw new Error(`Metric "${name}" is already registered as ${existing.type}`);
    }
    if (!existing) {
      this.families.set(name, {help, type});
    }
  }

  increment(name: string, labels: MetricLabels = {}, value = 1): void {
    this.register(name, name, MetricTypeEnum.COUNTER.toString());
    const series = this.scalarSeries(this.counters, name, labels, 0);
    series.value += value;
  }

  setGauge(name: string, labels: MetricLabels, value: number): void {
    this.register(name, name, MetricTypeEnum.GAUGE.toString());
    this.scalarSeries(this.gauges, name, labels, value).value = value;
  }

  adjustGauge(name: string, labels: MetricLabels, delta: number): void {
    this.register(name, name, MetricTypeEnum.GAUGE.toString());
    const series = this.scalarSeries(this.gauges, name, labels, 0);
    series.value += delta;
  }

  observe(name: string, labels: MetricLabels, value: number): void {
    this.register(name, name, MetricTypeEnum.HISTOGRAM.toString());
    const key = seriesKey(labels);
    const byLabels = this.histograms.get(name) ?? new Map<string, HistogramSeries>();
    let series = byLabels.get(key);
    if (!series) {
      series = {labels, buckets: new Map(BUCKETS.map((bucket) => [bucket, 0])), sum: 0, count: 0};
      byLabels.set(key, series);
    }
    for (const bucket of BUCKETS) {
      if (value <= bucket) {
        series.buckets.set(bucket, (series.buckets.get(bucket) ?? 0) + 1);
      }
    }
    series.sum += value;
    series.count += 1;
    this.histograms.set(name, byLabels);
  }

  counterValue(name: string, labels: MetricLabels = {}): number {
    return this.counters.get(name)?.get(seriesKey(labels))?.value ?? 0;
  }

  gaugeValue(name: string, labels: MetricLabels): number {
    return this.gauges.get(name)?.get(seriesKey(labels))?.value ?? 0;
  }

  render(): string {
    const lines: string[] = [];
    for (const [name, family] of this.families) {
      lines.push(`# HELP ${name} ${family.help}`, `# TYPE ${name} ${family.type.toString()}`);

      if (
        family.type === MetricTypeEnum.COUNTER.toString() ||
        family.type === MetricTypeEnum.GAUGE.toString()
      ) {
        const source =
          family.type === MetricTypeEnum.COUNTER.toString() ? this.counters : this.gauges;
        for (const series of source.get(name)?.values() ?? []) {
          lines.push(`${name}${renderLabels(series.labels)} ${series.value}`);
        }
        continue;
      }

      for (const series of this.histograms.get(name)?.values() ?? []) {
        for (const bucket of BUCKETS) {
          lines.push(
            `${name}_bucket${this.histogramLabels(series.labels, bucket)} ${
              series.buckets.get(bucket) ?? 0
            }`,
          );
        }
        lines.push(
          `${name}_bucket${this.histogramLabels(series.labels, '+Inf')} ${series.count}`,
          `${name}_sum${renderLabels(series.labels)} ${series.sum}`,
          `${name}_count${renderLabels(series.labels)} ${series.count}`,
        );
      }
    }
    return `${lines.join('\n')}\n`;
  }

  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
  }

  private scalarSeries(
    source: Map<string, Map<string, ScalarSeries>>,
    name: string,
    labels: MetricLabels,
    value: number,
  ): ScalarSeries {
    const key = seriesKey(labels);
    const byLabels = source.get(name) ?? new Map<string, ScalarSeries>();
    let series = byLabels.get(key);
    if (!series) {
      series = {labels, value};
      byLabels.set(key, series);
    }
    source.set(name, byLabels);
    return series;
  }

  private histogramLabels(labels: MetricLabels, bucket: number | '+Inf'): string {
    const withBucket: MetricLabels = {...labels, le: String(bucket)};
    return renderLabels(withBucket);
  }
}

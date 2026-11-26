import {Injectable} from '@nestjs/common';
import {
  JobKeyEnum,
  JobStatusEnum,
  MetricNameEnum,
  MetricTypeEnum,
  type StringEnumValues,
} from '@peco/enums';
import {MetricsRegistry} from './metrics-registry';

type JobKey = StringEnumValues<typeof JobKeyEnum>;
type JobStatus = StringEnumValues<typeof JobStatusEnum>;

const HELP: Readonly<Record<string, string>> = {
  [MetricNameEnum.HTTP_REQUEST_DURATION_SECONDS.toString()]: 'HTTP request duration in seconds.',
  [MetricNameEnum.HTTP_REQUESTS_TOTAL.toString()]: 'Total HTTP requests.',
  [MetricNameEnum.JOB_RUN_DURATION_SECONDS.toString()]: 'Scheduled job run duration in seconds.',
  [MetricNameEnum.JOB_PROCESSED_USERS_TOTAL.toString()]: 'Users processed by scheduled jobs.',
  [MetricNameEnum.OCCURRENCES_APPLIED_TOTAL.toString()]: 'Schedule occurrences applied.',
  [MetricNameEnum.OCCURRENCES_SKIPPED_TOTAL.toString()]: 'Schedule occurrences skipped.',
  [MetricNameEnum.OCCURRENCES_FAILED_TOTAL.toString()]: 'Schedule occurrences failed.',
  [MetricNameEnum.PERIODS_CLOSED_TOTAL.toString()]: 'Monthly periods closed.',
  [MetricNameEnum.RECONCILIATION_DRIFT_TOTAL.toString()]: 'Accounts with reconciliation drift.',
  [MetricNameEnum.SNAPSHOT_CHAIN_MISMATCH_TOTAL.toString()]: 'Snapshot chain mismatches.',
  [MetricNameEnum.DB_POOL_IN_USE.toString()]: 'Database connections currently in use.',
};

/** Typed façade over the registry so production code never repeats metric names (13.2). */
@Injectable()
export class MetricsService {
  constructor(private readonly registry: MetricsRegistry) {
    for (const [name, help] of Object.entries(HELP)) {
      const type =
        name === MetricNameEnum.HTTP_REQUEST_DURATION_SECONDS.toString() ||
        name === MetricNameEnum.JOB_RUN_DURATION_SECONDS.toString()
          ? MetricTypeEnum.HISTOGRAM
          : name === MetricNameEnum.DB_POOL_IN_USE.toString()
            ? MetricTypeEnum.GAUGE
            : MetricTypeEnum.COUNTER;
      this.registry.register(name, help, type.toString());
    }
  }

  recordHttpRequest(method: string, route: string, status: number, durationMs: number): void {
    const labels = {method, route, status: String(status)};
    this.registry.increment(MetricNameEnum.HTTP_REQUESTS_TOTAL.toString(), labels);
    this.registry.observe(
      MetricNameEnum.HTTP_REQUEST_DURATION_SECONDS.toString(),
      labels,
      durationMs / 1000,
    );
  }

  recordJobRun(jobKey: JobKey, status: JobStatus, durationMs: number): void {
    this.registry.observe(
      MetricNameEnum.JOB_RUN_DURATION_SECONDS.toString(),
      {job: jobKey, status},
      durationMs / 1000,
    );
  }

  addProcessedUsers(jobKey: JobKey, count: number): void {
    if (count > 0) {
      this.registry.increment(
        MetricNameEnum.JOB_PROCESSED_USERS_TOTAL.toString(),
        {job: jobKey},
        count,
      );
    }
  }

  addOccurrencesApplied(count = 1): void {
    this.registry.increment(MetricNameEnum.OCCURRENCES_APPLIED_TOTAL.toString(), {}, count);
  }

  addOccurrencesSkipped(count = 1): void {
    this.registry.increment(MetricNameEnum.OCCURRENCES_SKIPPED_TOTAL.toString(), {}, count);
  }

  addOccurrencesFailed(count = 1): void {
    this.registry.increment(MetricNameEnum.OCCURRENCES_FAILED_TOTAL.toString(), {}, count);
  }

  addPeriodsClosed(count = 1): void {
    this.registry.increment(MetricNameEnum.PERIODS_CLOSED_TOTAL.toString(), {}, count);
  }

  addReconciliationDrift(count = 1): void {
    this.registry.increment(MetricNameEnum.RECONCILIATION_DRIFT_TOTAL.toString(), {}, count);
  }

  addSnapshotChainMismatch(count = 1): void {
    this.registry.increment(MetricNameEnum.SNAPSHOT_CHAIN_MISMATCH_TOTAL.toString(), {}, count);
  }

  setDbPoolInUse(count: number): void {
    this.registry.setGauge(MetricNameEnum.DB_POOL_IN_USE.toString(), {}, count);
  }

  adjustDbPoolInUse(delta: number): void {
    this.registry.adjustGauge(MetricNameEnum.DB_POOL_IN_USE.toString(), {}, delta);
  }

  render(): string {
    return this.registry.render();
  }
}

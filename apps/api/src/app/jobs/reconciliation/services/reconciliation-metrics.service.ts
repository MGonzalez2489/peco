import {Injectable} from '@nestjs/common';
import {RECONCILIATION_DRIFT_METRIC} from '../constants/reconciliation-metric-name.constant';

/**
 * In-memory v1 counter for drifted accounts. It is process-local and resets on
 * restart; a scrape endpoint and durable aggregation are out of US-510's scope.
 */
@Injectable()
export class ReconciliationMetricsService {
  private driftTotal = 0;

  incrementDrift(): void {
    this.driftTotal += 1;
  }

  snapshot(): {name: string; value: number} {
    return {name: RECONCILIATION_DRIFT_METRIC, value: this.driftTotal};
  }

  reset(): void {
    this.driftTotal = 0;
  }
}

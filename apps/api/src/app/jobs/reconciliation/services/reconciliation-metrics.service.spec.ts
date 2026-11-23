import {ReconciliationMetricsService} from './reconciliation-metrics.service';

describe('ReconciliationMetricsService', () => {
  it('counts drifted accounts under the stable metric name', () => {
    const metrics = new ReconciliationMetricsService();

    expect(metrics.snapshot()).toEqual({name: 'reconciliation_drift_total', value: 0});
    metrics.incrementDrift();
    metrics.incrementDrift();
    expect(metrics.snapshot()).toEqual({name: 'reconciliation_drift_total', value: 2});

    metrics.reset();
    expect(metrics.snapshot().value).toBe(0);
  });
});

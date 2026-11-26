import {Logger} from '@nestjs/common';
import {AlertRuleEnum, AlertSeverityEnum, JobKeyEnum, JobStatusEnum} from '@peco/enums';
import {runWithCorrelationId} from '../middleware/correlation-id.context';
import {AlertService} from './alert.service';
import {runWithJobKey} from './job-context';
import {MetricsRegistry} from './metrics-registry';
import {MetricsService} from './metrics.service';

describe('observability (US-1002)', () => {
  it('renders counters, gauges and histograms in Prometheus text format', () => {
    const registry = new MetricsRegistry();
    registry.increment('events_total', {source: 'job'}, 2);
    registry.setGauge('pool_in_use', {}, 3);
    registry.observe('run_seconds', {job: 'cleanup'}, 0.02);

    const text = registry.render();

    expect(text).toContain('# TYPE events_total counter');
    expect(text).toContain('events_total{source="job"} 2');
    expect(text).toContain('# TYPE pool_in_use gauge');
    expect(text).toContain('pool_in_use 3');
    expect(text).toContain('# TYPE run_seconds histogram');
    expect(text).toContain('run_seconds_bucket{job="cleanup",le="0.025"} 1');
    expect(text).toContain('run_seconds_bucket{job="cleanup",le="+Inf"} 1');
    expect(text).toContain('run_seconds_count{job="cleanup"} 1');
  });

  it('records typed job and HTTP metrics under the documented names', () => {
    const registry = new MetricsRegistry();
    const metrics = new MetricsService(registry);

    metrics.recordJobRun(JobKeyEnum.AUTO_APPLY.toString(), JobStatusEnum.SUCCESS.toString(), 250);
    metrics.addProcessedUsers(JobKeyEnum.AUTO_APPLY.toString(), 4);
    metrics.addOccurrencesApplied(2);
    metrics.addOccurrencesSkipped();
    metrics.addOccurrencesFailed();
    metrics.addPeriodsClosed(3);
    metrics.addReconciliationDrift();
    metrics.addSnapshotChainMismatch();
    metrics.recordHttpRequest('GET', '/api/accounts', 200, 100);

    expect(
      registry.counterValue('job_processed_users_total', {
        job: JobKeyEnum.AUTO_APPLY.toString(),
      }),
    ).toBe(4);
    expect(registry.counterValue('occurrences_applied_total')).toBe(2);
    expect(registry.counterValue('occurrences_skipped_total')).toBe(1);
    expect(registry.counterValue('occurrences_failed_total')).toBe(1);
    expect(registry.counterValue('periods_closed_total')).toBe(3);
    expect(registry.counterValue('reconciliation_drift_total')).toBe(1);
    expect(registry.counterValue('snapshot_chain_mismatch_total')).toBe(1);
    expect(
      registry.counterValue('http_requests_total', {
        method: 'GET',
        route: '/api/accounts',
        status: '200',
      }),
    ).toBe(1);
  });

  it('emits an ALERT line with correlation and job context and no identifiers', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    try {
      runWithCorrelationId('01JC7Z3Q9K', () => {
        runWithJobKey(JobKeyEnum.RECONCILIATION.toString(), () => {
          new AlertService().raise(
            AlertRuleEnum.RECONCILIATION_DRIFT.toString(),
            AlertSeverityEnum.PAGE.toString(),
            {
              code: 'RECONCILE_MISMATCH',
              accountPublicId: 'must-be-dropped',
              userId: 99,
              delta: 100,
            },
          );
        });
      });

      expect(error).toHaveBeenCalledTimes(1);
      expect(error.mock.calls[0]?.[0]).toMatchObject({
        event: 'ALERT',
        rule: 'RECONCILIATION_DRIFT',
        severity: 'PAGE',
        correlationId: '01JC7Z3Q9K',
        jobKey: 'RECONCILIATION',
        dimensions: {code: 'RECONCILE_MISMATCH', delta: 100},
      });
    } finally {
      error.mockRestore();
    }
  });
});

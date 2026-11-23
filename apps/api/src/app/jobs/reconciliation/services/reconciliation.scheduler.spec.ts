import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import {ReconciliationScheduler} from './reconciliation.scheduler';
import type {ReconciliationService} from './reconciliation.service';

const config = (cron: string): ConfigService =>
  new ConfigService({jobs: {reconciliationCron: cron}} as AppConfig);

const success = {
  acquired: true,
  scannedAccounts: 0,
  mismatches: 0,
};

describe('ReconciliationScheduler', () => {
  it('runs once per matching UTC minute', async () => {
    let now = '2026-11-22T03:00:00.000Z';
    const clock = {now: jest.fn(() => now)} as unknown as UtcClock;
    const service = {reconcile: jest.fn(async () => success)} as unknown as ReconciliationService;
    const scheduler = new ReconciliationScheduler(config('0 3 * * *'), clock, service);

    await scheduler.runIfDue();
    await scheduler.runIfDue();
    now = '2026-11-22T04:00:00.000Z';
    await scheduler.runIfDue();

    expect(service.reconcile).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the configured cron window', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-22T03:01:00.000Z'),
    } as unknown as UtcClock;
    const service = {reconcile: jest.fn(async () => success)} as unknown as ReconciliationService;
    const scheduler = new ReconciliationScheduler(config('0 3 * * *'), clock, service);

    await scheduler.runIfDue();

    expect(service.reconcile).not.toHaveBeenCalled();
  });

  it('swallows job failures so the interval keeps ticking', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-22T03:00:00.000Z'),
    } as unknown as UtcClock;
    const service = {
      reconcile: jest.fn(async () => {
        throw new Error('mysql down');
      }),
    } as unknown as ReconciliationService;
    const scheduler = new ReconciliationScheduler(config('0 3 * * *'), clock, service);

    await expect(scheduler.runIfDue()).resolves.toBeUndefined();
    expect(service.reconcile).toHaveBeenCalledTimes(1);
  });
});

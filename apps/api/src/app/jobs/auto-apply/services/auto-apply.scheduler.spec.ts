import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import {AutoApplyScheduler} from './auto-apply.scheduler';
import type {AutoApplyService} from './auto-apply.service';

const config = (cron: string): ConfigService =>
  new ConfigService({jobs: {autoApplyCron: cron}} as AppConfig);

const success = {
  acquired: true,
  usersProcessed: 0,
  applied: 0,
  skipped: 0,
  failed: 0,
  skippedWhileInactive: 0,
  errors: 0,
};

describe('AutoApplyScheduler', () => {
  it('runs once per matching UTC minute', async () => {
    let now = '2026-11-23T00:05:00.000Z';
    const clock = {now: jest.fn(() => now)} as unknown as UtcClock;
    const service = {run: jest.fn(async () => success)} as unknown as AutoApplyService;
    const scheduler = new AutoApplyScheduler(config('5 0 * * *'), clock, service);

    await scheduler.runIfDue();
    await scheduler.runIfDue();
    now = '2026-11-23T00:06:00.000Z';
    await scheduler.runIfDue();

    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the configured cron window', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-23T00:04:00.000Z'),
    } as unknown as UtcClock;
    const service = {run: jest.fn(async () => success)} as unknown as AutoApplyService;
    const scheduler = new AutoApplyScheduler(config('5 0 * * *'), clock, service);

    await scheduler.runIfDue();

    expect(service.run).not.toHaveBeenCalled();
  });

  it('swallows job failures so the interval keeps ticking', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-23T00:05:00.000Z'),
    } as unknown as UtcClock;
    const service = {
      run: jest.fn(async () => {
        throw new Error('mysql down');
      }),
    } as unknown as AutoApplyService;
    const scheduler = new AutoApplyScheduler(config('5 0 * * *'), clock, service);

    await expect(scheduler.runIfDue()).resolves.toBeUndefined();
    expect(service.run).toHaveBeenCalledTimes(1);
  });
});

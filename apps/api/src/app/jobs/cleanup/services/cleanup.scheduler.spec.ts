import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import {CleanupScheduler} from './cleanup.scheduler';
import type {CleanupService} from './cleanup.service';

const config = (cron: string): ConfigService =>
  new ConfigService({jobs: {cleanupCron: cron}} as AppConfig);

const result = {
  acquired: true,
  idempotencyKeys: 0,
  refreshTokens: 0,
  auditLogs: 0,
};

describe('CleanupScheduler', () => {
  it('runs once per matching UTC minute', async () => {
    let now = '2026-11-25T04:00:00.000Z';
    const clock = {now: jest.fn(() => now)} as unknown as UtcClock;
    const service = {run: jest.fn(async () => result)} as unknown as CleanupService;
    const scheduler = new CleanupScheduler(config('0 4 * * *'), clock, service);

    await scheduler.runIfDue();
    await scheduler.runIfDue();
    now = '2026-11-25T04:01:00.000Z';
    await scheduler.runIfDue();

    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it('does nothing outside the configured cron window', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-25T03:59:00.000Z'),
    } as unknown as UtcClock;
    const service = {run: jest.fn(async () => result)} as unknown as CleanupService;

    await new CleanupScheduler(config('0 4 * * *'), clock, service).runIfDue();

    expect(service.run).not.toHaveBeenCalled();
  });

  it('falls back to the documented cron when configuration omits it', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-25T04:00:00.000Z'),
    } as unknown as UtcClock;
    const service = {run: jest.fn(async () => result)} as unknown as CleanupService;

    await new CleanupScheduler(
      new ConfigService({jobs: {}} as AppConfig),
      clock,
      service,
    ).runIfDue();

    expect(service.run).toHaveBeenCalledTimes(1);
  });

  it('swallows job failures so the interval keeps ticking', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-25T04:00:00.000Z'),
    } as unknown as UtcClock;
    const service = {
      run: jest.fn(async () => {
        throw new Error('mysql down');
      }),
    } as unknown as CleanupService;

    await expect(
      new CleanupScheduler(config('0 4 * * *'), clock, service).runIfDue(),
    ).resolves.toBeUndefined();
    expect(service.run).toHaveBeenCalledTimes(1);
  });
});

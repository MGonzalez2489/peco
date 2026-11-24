import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import type {PeriodCloseJobResult} from '../types/period-close-job-result.type';
import type {PeriodCloseJobService} from './period-close-job.service';
import {PeriodCloseScheduler} from './period-close.scheduler';

const config = (cron: string): ConfigService =>
  new ConfigService({jobs: {periodCloseCron: cron}} as AppConfig);

const result = (overrides: Partial<PeriodCloseJobResult> = {}): PeriodCloseJobResult => ({
  acquired: true,
  deferred: false,
  trigger: 'cron',
  usersProcessed: 0,
  closed: 0,
  repaired: 0,
  truncated: 0,
  errors: 0,
  postponed: 0,
  ...overrides,
});

describe('PeriodCloseScheduler (US-704)', () => {
  it('runs the cron once per matching UTC minute', async () => {
    let now = '2026-11-24T00:10:00.000Z';
    const clock = {now: jest.fn(() => now)} as unknown as UtcClock;
    const service = {run: jest.fn(async () => result())} as unknown as PeriodCloseJobService;
    const scheduler = new PeriodCloseScheduler(config('10 0 * * *'), clock, service);

    await scheduler.runIfDue();
    await scheduler.runIfDue();
    now = '2026-11-24T00:11:00.000Z';
    await scheduler.runIfDue();

    expect(service.run).toHaveBeenCalledTimes(1);
    expect(service.run).toHaveBeenCalledWith('cron');
  });

  it('retries a deferred cron run in the same minute after auto-apply completes', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-24T00:10:00.000Z'),
    } as unknown as UtcClock;
    const service = {
      run: jest
        .fn()
        .mockResolvedValueOnce(result({acquired: false, deferred: true}))
        .mockResolvedValueOnce(result()),
    } as unknown as PeriodCloseJobService;
    const scheduler = new PeriodCloseScheduler(config('10 0 * * *'), clock, service);

    await scheduler.runIfDue();
    await scheduler.runIfDue();
    await scheduler.runIfDue();

    expect(service.run).toHaveBeenCalledTimes(2);
  });

  it('runs a startup sweep outside the cron minute and lets the cron own it otherwise', async () => {
    let now = '2026-11-24T00:09:00.000Z';
    const clock = {now: jest.fn(() => now)} as unknown as UtcClock;
    const service = {run: jest.fn(async () => result())} as unknown as PeriodCloseJobService;
    const scheduler = new PeriodCloseScheduler(config('10 0 * * *'), clock, service);

    await scheduler.runStartupSweep();
    now = '2026-11-24T00:10:00.000Z';
    await scheduler.runStartupSweep();

    expect(service.run).toHaveBeenCalledTimes(1);
    expect(service.run).toHaveBeenCalledWith('startup');
  });

  it('swallows job failures so the interval keeps ticking', async () => {
    const clock = {
      now: jest.fn(() => '2026-11-24T00:10:00.000Z'),
    } as unknown as UtcClock;
    const service = {
      run: jest.fn(async () => {
        throw new Error('mysql down');
      }),
    } as unknown as PeriodCloseJobService;
    const scheduler = new PeriodCloseScheduler(config('10 0 * * *'), clock, service);

    await expect(scheduler.runIfDue()).resolves.toBeUndefined();
    expect(service.run).toHaveBeenCalledTimes(1);
  });
});

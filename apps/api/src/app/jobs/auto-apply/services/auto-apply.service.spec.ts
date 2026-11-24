import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import type {ScheduledTransactionsService} from '../../../scheduled-transactions/scheduled-transactions.service';
import type {ApplyDueOptions} from '../../../scheduled-transactions/types/apply-due-options.type';
import type {AutoApplyRepository} from './auto-apply.repository';
import {AutoApplyService} from './auto-apply.service';

const NOW = '2026-11-23T00:05:00.000Z';

const config = new ConfigService({
  operational: {inactiveUserDays: 90, catchupBatchSize: 500},
  jobs: {autoApplyCron: '5 0 * * *'},
} as AppConfig);

const clock = {now: () => NOW} as unknown as UtcClock;

const dueResult = (applied: number) => ({
  asOf: '2026-11-23',
  results: Array.from({length: applied}, () => ({})),
  schedules: [],
  applied,
  skipped: 1,
  failed: 0,
  skippedWhileInactive: 0,
});

const setup = (users: {publicId: string}[]) => {
  const repository = {
    withLock: jest.fn(async (work: () => Promise<unknown>) => work()),
    findEligibleUserPublicIds: jest.fn(async () => users),
  } as unknown as AutoApplyRepository;
  const schedules = {
    applyDue: jest.fn(async () => dueResult(1)),
  } as unknown as ScheduledTransactionsService;
  const service = new AutoApplyService(config, clock, repository, schedules);
  return {repository, schedules, service};
};

describe('AutoApplyService', () => {
  it('filters eligible users by the D58 cutoff and reuses applyDue with autoApply only', async () => {
    const users = [{publicId: 'user-1'}, {publicId: 'user-2'}];
    const {repository, schedules, service} = setup(users);

    const result = await service.run();

    expect(repository.findEligibleUserPublicIds).toHaveBeenCalledWith(
      '2026-08-25T00:05:00.000Z',
      '2026-11-23',
    );
    expect(schedules.applyDue).toHaveBeenCalledTimes(2);
    expect(schedules.applyDue).toHaveBeenCalledWith(
      'user-1',
      {asOf: '2026-11-23'},
      null,
      expect.objectContaining({autoApply: true}),
    );
    expect(result).toEqual({
      acquired: true,
      usersProcessed: 2,
      applied: 2,
      skipped: 2,
      failed: 0,
      skippedWhileInactive: 0,
      errors: 0,
      cappedUserPublicIds: [],
    });
    expect(service.hasCompletedForDate('2026-11-23')).toBe(true);
  });

  it('isolates a failing user so the remaining queue still runs', async () => {
    const {schedules, service} = setup([{publicId: 'bad'}, {publicId: 'good'}]);
    jest
      .spyOn(schedules, 'applyDue')
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(dueResult(1) as never);

    const result = await service.run();

    expect(result).toMatchObject({usersProcessed: 2, applied: 1, errors: 1});
  });

  it('returns an empty summary when another instance holds the run lock', async () => {
    const {repository, schedules, service} = setup([{publicId: 'user-1'}]);
    jest.spyOn(repository, 'withLock').mockResolvedValueOnce(null);

    await expect(service.run()).resolves.toEqual({
      acquired: false,
      usersProcessed: 0,
      applied: 0,
      skipped: 0,
      failed: 0,
      skippedWhileInactive: 0,
      errors: 0,
      cappedUserPublicIds: [],
    });
    expect(schedules.applyDue).not.toHaveBeenCalled();
    expect(service.hasCompletedForDate('2026-11-23')).toBe(false);
  });

  it('counts isolated per-schedule failures reported by the catch-up executor', async () => {
    const {schedules, service} = setup([{publicId: 'user-1'}]);
    jest.spyOn(schedules, 'applyDue').mockImplementationOnce(
      async (_publicId, _request, _previous, options?: ApplyDueOptions) => {
        options?.onScheduleError?.('schedule-1', new Error('unexpected'));
        return dueResult(0) as never;
      },
    );

    const result = await service.run();

    expect(result.errors).toBe(1);
  });

  it('exposes capped users once so closing postpones exactly one run', async () => {
    const {schedules, service} = setup([{publicId: 'capped'}]);
    jest
      .spyOn(schedules, 'applyDue')
      .mockResolvedValue(dueResult(500) as never);

    const result = await service.run();

    expect(result.cappedUserPublicIds).toEqual(['capped']);
    expect(service.takeCappedUserPublicIds()).toEqual(['capped']);
    expect(service.takeCappedUserPublicIds()).toEqual([]);
  });
});

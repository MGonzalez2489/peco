import {Logger} from '@nestjs/common';
import type {AppConfig} from '../../../config/app-config';
import {ConfigService} from '../../../config/config.service';
import type {UtcClock} from '../../../database/clock/utc-clock';
import type {PeriodClosingService} from '../../../periods/services/period-closing.service';
import type {AutoApplyService} from '../../auto-apply/services/auto-apply.service';
import {AUTO_APPLY_CAP_POSTPONED_CODE} from '../constants/auto-apply-cap-postponed-code.constant';
import {PERIOD_CLOSE_ORDER_DEFERRED_CODE} from '../constants/period-close-order-deferred-code.constant';
import type {PeriodCloseRepository} from './period-close.repository';
import {PeriodCloseJobService} from './period-close-job.service';

const NOW = '2026-11-24T00:10:00.000Z';
const ACTIVE_SINCE = '2026-08-26T00:10:00.000Z';
const TOTALS = {usersProcessed: 2, closed: 3, repaired: 0, truncated: 0, errors: 0};

const config = new ConfigService({
  operational: {inactiveUserDays: 90, catchupBatchSize: 500},
} as AppConfig);

const setup = (options: {completed?: boolean; capped?: string[]} = {}) => {
  const repository = {
    withLock: jest.fn(async (work: () => Promise<unknown>) => work()),
    findActiveUserPublicIds: jest.fn(async () => [{publicId: 'active-1'}, {publicId: 'active-2'}]),
  };
  const closing = {backfill: jest.fn(async () => TOTALS)};
  const autoApply = {
    hasCompletedForDate: jest.fn(() => options.completed ?? true),
    takeCappedUserPublicIds: jest.fn(() => options.capped ?? []),
  };
  const service = new PeriodCloseJobService(
    repository as unknown as PeriodCloseRepository,
    closing as unknown as PeriodClosingService,
    autoApply as unknown as AutoApplyService,
    {now: () => NOW} as UtcClock,
    config,
  );
  return {repository, closing, autoApply, service};
};

describe('PeriodCloseJobService (US-704)', () => {
  let warn: jest.SpyInstance;

  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('defers a cron run until auto-apply has completed for the UTC date', async () => {
    const {repository, closing, autoApply, service} = setup({
      completed: false,
      capped: ['active-1'],
    });

    const result = await service.run('cron');

    expect(result).toEqual({
      acquired: false,
      deferred: true,
      trigger: 'cron',
      usersProcessed: 0,
      closed: 0,
      repaired: 0,
      truncated: 0,
      errors: 0,
      postponed: 0,
    });
    expect(warn).toHaveBeenCalledWith({
      code: PERIOD_CLOSE_ORDER_DEFERRED_CODE,
      asOf: '2026-11-24',
      requiredBefore: 'auto-apply',
    });
    expect(autoApply.takeCappedUserPublicIds).not.toHaveBeenCalled();
    expect(repository.findActiveUserPublicIds).not.toHaveBeenCalled();
    expect(closing.backfill).not.toHaveBeenCalled();
  });

  it('runs a startup sweep without the auto-apply gate using the D58 cutoff', async () => {
    const {repository, closing, service} = setup({completed: false});

    const result = await service.run('startup');

    expect(repository.findActiveUserPublicIds).toHaveBeenCalledWith(ACTIVE_SINCE);
    expect(closing.backfill).toHaveBeenCalledWith(['active-1', 'active-2']);
    expect(result).toMatchObject({acquired: true, deferred: false, trigger: 'startup', closed: 3});
  });

  it('postpones a capped user for exactly one run', async () => {
    const {closing, autoApply, service} = setup({capped: ['active-1']});
    autoApply.takeCappedUserPublicIds.mockReturnValueOnce(['active-1']).mockReturnValueOnce([]);

    const first = await service.run('cron');
    const second = await service.run('cron');

    expect(closing.backfill).toHaveBeenNthCalledWith(1, ['active-2']);
    expect(closing.backfill).toHaveBeenNthCalledWith(2, ['active-1', 'active-2']);
    expect(first).toMatchObject({postponed: 1, usersProcessed: 2});
    expect(second).toMatchObject({postponed: 0, usersProcessed: 2});
    expect(warn).toHaveBeenCalledWith({
      code: AUTO_APPLY_CAP_POSTPONED_CODE,
      asOf: '2026-11-24',
      batchSize: 500,
    });
  });

  it('returns an empty summary when another instance holds the run lock', async () => {
    const {repository, closing, service} = setup();
    repository.withLock.mockResolvedValueOnce(null);

    const result = await service.run('cron');

    expect(result).toEqual({
      acquired: false,
      deferred: false,
      trigger: 'cron',
      usersProcessed: 0,
      closed: 0,
      repaired: 0,
      truncated: 0,
      errors: 0,
      postponed: 0,
    });
    expect(closing.backfill).not.toHaveBeenCalled();
  });
});

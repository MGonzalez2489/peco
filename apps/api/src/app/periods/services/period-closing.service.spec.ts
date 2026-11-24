import {HttpStatus, Logger} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {UtcClock} from '../../database/clock/utc-clock';
import {ConfigService} from '../../config/config.service';
import {PERIOD_BACKFILL_TRUNCATED_CODE} from '../constants/period-backfill-truncated-code.constant';
import {SNAPSHOT_GAP_REPAIRED_CODE} from '../constants/snapshot-gap-repaired-code.constant';
import type {
  AccountPeriodBalanceEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../../database/entities';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {PeriodCloseResult} from '../types/period-close-result.type';
import {PeriodClosingRepository} from './period-closing.repository';
import {PeriodClosingService} from './period-closing.service';

const NOW = '2026-11-24T09:00:00.000Z';

const snapshot = (period: string): PeriodSnapshotEntity =>
  ({
    id: 1,
    publicId: `snapshot-${period}`,
    userId: 7,
    period,
    startDate: `${period}-01`,
    endDate: `${period}-30`,
    globalInitialBalance: 100_000,
    globalFinalBalance: 120_000,
    totalInflows: 20_000,
    totalOutflows: 0,
    totalTransfers: 0,
    totalTransactionsCount: 1,
    createdAt: NOW,
  }) as PeriodSnapshotEntity;

const balance = (): AccountPeriodBalanceEntity =>
  ({
    id: 1,
    accountId: 2,
    account: {publicId: 'account-public-id'} as AccountPeriodBalanceEntity['account'],
    accountName: 'Efectivo',
    accountType: 'CASH',
    color: '#10B981',
    icon: 'banknote',
    initialBalance: 100_000,
    finalBalance: 120_000,
    totalTransactions: 1,
    totalInflows: 20_000,
    totalOutflows: 0,
    totalTransfers: 0,
  }) as AccountPeriodBalanceEntity;

const success = (period: string, created: boolean): PeriodCloseResult => ({
  created,
  snapshot: snapshot(period),
  balances: [balance()],
});

const expectApiFailure = async (
  attempt: Promise<unknown>,
  statusCode: HttpStatus,
  code: string,
): Promise<ApiException> => {
  const error = await attempt.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiException);
  const exception = error as ApiException;
  expect(exception.getStatus()).toBe(statusCode);
  expect(exception.code).toBe(code);
  return exception;
};

describe('PeriodClosingService (US-701/US-702)', () => {
  let repository: {
    findFirstActivityPeriod: jest.Mock;
    findClosedPeriods: jest.Mock;
    close: jest.Mock;
  };
  let users: {findActiveByPublicId: jest.Mock};
  let service: PeriodClosingService;
  let operational: {maxBackfillMonths: number};
  let warn: jest.SpyInstance;
  let error: jest.SpyInstance;

  const config = (): ConfigService =>
    ({config: {operational}}) as unknown as ConfigService;

  beforeEach(() => {
    operational = {maxBackfillMonths: 120};
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    error = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    repository = {
      findFirstActivityPeriod: jest.fn().mockResolvedValue('2026-09'),
      findClosedPeriods: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockImplementation(async (_id: number, period: string) => success(period, true)),
    };
    users = {
      findActiveByPublicId: jest.fn().mockResolvedValue({id: 7} as UserEntity),
    };
    service = new PeriodClosingService(
      repository as unknown as PeriodClosingRepository,
      users as unknown as UserProfileRepository,
      {now: () => NOW} as UtcClock,
      config(),
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('closes every missing month from the first activity, oldest first', async () => {
    const outcome = await service.close('user-public-id', '2026-10');

    expect(repository.close.mock.calls).toEqual([
      [7, '2026-09'],
      [7, '2026-10'],
    ]);
    expect(outcome.created).toBe(true);
    expect(outcome.snapshot.period).toBe('2026-10');
    expect(outcome.snapshot.accountBalances[0].accountPublicId).toBe('account-public-id');
  });

  it('reports a replay without recomputing the stored snapshot', async () => {
    repository.findClosedPeriods.mockResolvedValue(['2026-09', '2026-10']);
    repository.close.mockResolvedValue(success('2026-10', false));

    await expect(service.close('user-public-id', '2026-10')).resolves.toMatchObject({
      created: false,
    });
    expect(repository.close.mock.calls).toEqual([[7, '2026-10']]);
  });

  it.each(['2026-11', '2026-12'])('rejects the current or a future period %s', async (period) => {
    await expectApiFailure(
      service.close('user-public-id', period),
      HttpStatus.CONFLICT,
      ApiErrorCodeEnum.PERIOD_NOT_CLOSABLE.toString(),
    );
    expect(repository.close).not.toHaveBeenCalled();
  });

  it('rejects a period before the first activity', async () => {
    await expectApiFailure(
      service.close('user-public-id', '2026-08'),
      HttpStatus.UNPROCESSABLE_ENTITY,
      ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY.toString(),
    );
  });

  it('rejects a foreign user', async () => {
    users.findActiveByPublicId.mockResolvedValue(null);

    const error = await expectApiFailure(
      service.close('foreign', '2026-10'),
      HttpStatus.NOT_FOUND,
      ApiErrorCodeEnum.NOT_FOUND.toString(),
    );
    expect(error.userMessage).toBe(API_ERROR_MESSAGES.NOT_FOUND);
  });

  it('maps an owner that disappeared during the transaction to 404', async () => {
    repository.close.mockResolvedValue({status: ApiErrorCodeEnum.NOT_FOUND.toString()});

    await expect(service.close('user-public-id', '2026-10')).rejects.toBeInstanceOf(ApiException);
  });

  it('repairs a middle hole without touching the snapshots around it', async () => {
    repository.findClosedPeriods.mockResolvedValue(['2026-09', '2026-11']);

    const outcome = await service.close('user-public-id', '2026-10');

    expect(repository.close.mock.calls).toEqual([[7, '2026-10']]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: SNAPSHOT_GAP_REPAIRED_CODE,
        userPublicId: 'user-public-id',
        period: '2026-10',
        nextClosedPeriod: '2026-11',
      }),
    );
    expect(outcome.created).toBe(true);
  });

  it('stops a bounded run at the cap and logs the truncation', async () => {
    operational.maxBackfillMonths = 2;
    repository.findFirstActivityPeriod.mockResolvedValue('2026-01');
    repository.findClosedPeriods.mockResolvedValue(['2026-01']);

    const result = await service.backfill([`user-public-id`], '2026-05');

    expect(repository.close.mock.calls).toEqual([
      [7, '2026-02'],
      [7, '2026-03'],
    ]);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PERIOD_BACKFILL_TRUNCATED_CODE,
        userPublicId: 'user-public-id',
        closedThrough: '2026-03',
        nextPeriod: '2026-04',
        remaining: 2,
      }),
    );
    expect(result).toEqual({usersProcessed: 1, closed: 2, repaired: 0, truncated: 1, errors: 0});
  });

  it('continues a capped backfill where the previous run stopped', async () => {
    operational.maxBackfillMonths = 2;
    repository.findFirstActivityPeriod.mockResolvedValue('2026-01');
    repository.findClosedPeriods.mockResolvedValueOnce(['2026-01']);

    await service.backfill(['user-public-id'], '2026-05');

    repository.close.mockClear();
    repository.findClosedPeriods.mockResolvedValue(['2026-01', '2026-02', '2026-03']);
    const result = await service.backfill(['user-public-id'], '2026-05');

    expect(repository.close.mock.calls).toEqual([
      [7, '2026-04'],
      [7, '2026-05'],
    ]);
    expect(result).toEqual({usersProcessed: 1, closed: 2, repaired: 0, truncated: 0, errors: 0});
  });

  it('logs a repaired gap and counts it in a bounded run', async () => {
    repository.findClosedPeriods.mockResolvedValue(['2026-09', '2026-11']);

    const result = await service.backfill(['user-public-id'], '2026-10');

    expect(result).toEqual({usersProcessed: 1, closed: 1, repaired: 1, truncated: 0, errors: 0});
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({code: SNAPSHOT_GAP_REPAIRED_CODE, period: '2026-10'}),
    );
  });

  it('isolates one failing user from the rest of the batch', async () => {
    users.findActiveByPublicId.mockImplementation(async (publicId: string) => ({
      id: publicId === 'broken' ? 7 : 8,
    }));
    repository.close.mockImplementation(async (userId: number, period: string) => {
      if (userId === 7) {
        throw new Error('broken user');
      }
      return success(period, true);
    });

    const result = await service.backfill(['broken', 'healthy'], '2026-10');

    expect(error).toHaveBeenCalledWith('Period backfill failed for user broken', expect.any(String));
    expect(repository.close.mock.calls).toEqual([
      [7, '2026-09'],
      [8, '2026-09'],
      [8, '2026-10'],
    ]);
    expect(result).toEqual({usersProcessed: 2, closed: 2, repaired: 0, truncated: 0, errors: 1});
  });
});

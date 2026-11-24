import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {UtcClock} from '../../database/clock/utc-clock';
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

describe('PeriodClosingService (US-701)', () => {
  let repository: {
    findFirstActivityPeriod: jest.Mock;
    close: jest.Mock;
  };
  let users: {findActiveByPublicId: jest.Mock};
  let service: PeriodClosingService;

  beforeEach(() => {
    repository = {
      findFirstActivityPeriod: jest.fn().mockResolvedValue('2026-09'),
      close: jest.fn().mockImplementation(async (_id: number, period: string) => success(period, true)),
    };
    users = {
      findActiveByPublicId: jest.fn().mockResolvedValue({id: 7} as UserEntity),
    };
    service = new PeriodClosingService(
      repository as unknown as PeriodClosingRepository,
      users as unknown as UserProfileRepository,
      {now: () => NOW} as UtcClock,
    );
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
    repository.close.mockResolvedValue(success('2026-10', false));

    await expect(service.close('user-public-id', '2026-10')).resolves.toMatchObject({
      created: false,
    });
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
});

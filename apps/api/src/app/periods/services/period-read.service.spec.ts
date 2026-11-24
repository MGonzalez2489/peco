import type {ListPeriodsQuery} from '@peco/contracts';
import {UtcClock} from '../../database/clock/utc-clock';
import type {AccountPeriodBalanceEntity, PeriodSnapshotEntity} from '../../database/entities';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {PeriodReadRepository} from './period-read.repository';
import {PeriodReadService} from './period-read.service';

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

const balance = (accountId: number, name: string): AccountPeriodBalanceEntity =>
  ({
    id: accountId,
    accountId,
    account: {publicId: `account-${accountId}`},
    accountName: name,
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

describe('PeriodReadService (US-703)', () => {
  let repository: {list: jest.Mock; findByPeriod: jest.Mock};
  let users: {findActiveByPublicId: jest.Mock};
  let service: PeriodReadService;

  beforeEach(() => {
    repository = {
      list: jest.fn().mockResolvedValue([snapshot('2026-10'), snapshot('2026-09')]),
      findByPeriod: jest
        .fn()
        .mockResolvedValue({snapshot: snapshot('2026-10'), balances: [balance(9, 'Ahorro')]}),
    };
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7})};
    service = new PeriodReadService(
      repository as unknown as PeriodReadRepository,
      users as unknown as UserProfileRepository,
      {now: () => NOW} as UtcClock,
    );
  });

  it('defaults to the last 12 closed months, newest first, with closedAt from createdAt', async () => {
    const result = await service.list('user-public-id', {});

    expect(users.findActiveByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(repository.list).toHaveBeenCalledWith(7, '2025-11', '2026-10');
    expect(result.map(({period}) => period)).toEqual(['2026-10', '2026-09']);
    expect(result[0].closedAt).toBe(NOW);
    expect(result[0]).not.toHaveProperty('accountBalances');
  });

  it('forwards an explicit inclusive range', async () => {
    const query: ListPeriodsQuery = {from: '2026-08', to: '2026-10'};

    await service.list('user-public-id', query);

    expect(repository.list).toHaveBeenCalledWith(7, '2026-08', '2026-10');
  });

  it('defaults the range end to the previous month when only from is supplied', async () => {
    await service.list('user-public-id', {from: '2025-11'});

    expect(repository.list).toHaveBeenCalledWith(7, '2025-11', '2026-10');
  });

  it('defaults the range start to 12 months when only to is supplied', async () => {
    await service.list('user-public-id', {to: '2025-05'});

    expect(repository.list).toHaveBeenCalledWith(7, '2024-06', '2025-05');
  });

  it.each<ListPeriodsQuery>([
    {from: '2024-01', to: '2026-10'},
    {from: '2026-11', to: '2026-10'},
    {from: '2024-01'},
  ])('rejects the out-of-bounds range %p with 400 VALIDATION_ERROR', async (query) => {
    const error = await service.list('user-public-id', query).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(400);
    expect((error as ApiException).code).toBe('VALIDATION_ERROR');
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('returns the full snapshot with its frozen account labels', async () => {
    repository.findByPeriod.mockResolvedValue({
      snapshot: snapshot('2026-10'),
      balances: [balance(9, 'Ahorro'), balance(2, 'Efectivo')],
    });

    const result = await service.find('user-public-id', '2026-10');

    expect(repository.findByPeriod).toHaveBeenCalledWith(7, '2026-10');
    expect(result.period).toBe('2026-10');
    expect(result.closedAt).toBe(NOW);
    expect(result.accountBalances.map(({accountPublicId}) => accountPublicId)).toEqual([
      'account-2',
      'account-9',
    ]);
    expect(result.accountBalances[0].accountName).toBe('Efectivo');
  });

  it.each([null, undefined])('answers 404 for a missing or foreign snapshot', async (value) => {
    repository.findByPeriod.mockResolvedValue(value);

    const error = await service.find('user-public-id', '2020-01').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
    expect((error as ApiException).userMessage).toBe(API_ERROR_MESSAGES.NOT_FOUND);
  });

  it('does not reach the repository when the active user is gone', async () => {
    users.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.find('user-public-id', '2026-10')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(service.list('user-public-id', {})).rejects.toMatchObject({code: 'NOT_FOUND'});
    expect(repository.findByPeriod).not.toHaveBeenCalled();
    expect(repository.list).not.toHaveBeenCalled();
  });
});

import {AccountTypeEnum} from '@peco/enums';
import {ApiException} from '../../common/http/api-exception';
import {UtcClock} from '../../database/clock/utc-clock';
import type {
  AccountPeriodBalanceEntity,
  PeriodSnapshotEntity,
} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {PeriodCalculation} from '../types/period-calculation.type';
import {PeriodClosingRepository} from './period-closing.repository';
import {PeriodReadRepository} from './period-read.repository';
import {PeriodReportService} from './period-report.service';

const NOW = '2026-11-05T10:00:00.000Z';

const snapshot = (period: string): PeriodSnapshotEntity =>
  ({
    id: 3,
    userId: 7,
    period,
    globalInitialBalance: 100_000,
    globalFinalBalance: 115_000,
    totalInflows: 50_000,
    totalOutflows: 25_000,
    totalTransactionsCount: 3,
  }) as PeriodSnapshotEntity;

const frozenBalance = (
  accountType: string,
  finalBalance: number,
  includeInTotal: boolean,
): AccountPeriodBalanceEntity =>
  ({
    accountType,
    finalBalance,
    includeInTotal,
  }) as AccountPeriodBalanceEntity;

const ledgerCalculation = (): PeriodCalculation =>
  ({
    accountBalances: [
      {
        account: {type: AccountTypeEnum.CASH.toString(), includeInTotal: true},
        finalBalance: 130_000,
      },
      {
        account: {type: AccountTypeEnum.CREDIT.toString(), includeInTotal: true},
        finalBalance: -35_000,
      },
      {
        account: {type: AccountTypeEnum.SAVINGS.toString(), includeInTotal: false},
        finalBalance: 20_000,
      },
    ],
    globalFinalBalance: 115_000,
    totalInflows: 50_000,
    totalOutflows: 25_000,
    totalTransactionsCount: 3,
  }) as PeriodCalculation;

describe('PeriodReportService (US-705)', () => {
  let read: {findByPeriod: jest.Mock};
  let closing: {project: jest.Mock};
  let users: {findActiveByPublicId: jest.Mock};
  let service: PeriodReportService;

  beforeEach(() => {
    read = {findByPeriod: jest.fn().mockResolvedValue(null)};
    closing = {project: jest.fn().mockResolvedValue(ledgerCalculation())};
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7})};
    service = new PeriodReportService(
      read as unknown as PeriodReadRepository,
      closing as unknown as PeriodClosingRepository,
      users as unknown as UserProfileRepository,
      {now: () => NOW} as UtcClock,
    );
  });

  it('reads a past month with a snapshot and derives balances from frozen rows', async () => {
    read.findByPeriod.mockResolvedValue({
      snapshot: snapshot('2026-09'),
      balances: [
        frozenBalance(AccountTypeEnum.CASH.toString(), 130_000, true),
        frozenBalance(AccountTypeEnum.CREDIT.toString(), -35_000, true),
        frozenBalance(AccountTypeEnum.SAVINGS.toString(), 20_000, false),
      ],
    });

    const result = await service.find('user-public-id', '2026-09');

    expect(users.findActiveByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(read.findByPeriod).toHaveBeenCalledWith(7, '2026-09');
    expect(closing.project).not.toHaveBeenCalled();
    expect(result).toEqual({
      period: '2026-09',
      frozen: true,
      totals: {
        totalIncome: 50_000,
        totalExpenses: 25_000,
        netBalance: 25_000,
        transactionCount: 3,
      },
      balances: {
        totalBalance: 115_000,
        availableBalance: 130_000,
        liabilitiesBalance: 35_000,
      },
    });
  });

  it('falls back to the ledger when a past month has no snapshot', async () => {
    const result = await service.find('user-public-id', '2026-09');

    expect(read.findByPeriod).toHaveBeenCalledWith(7, '2026-09');
    expect(closing.project).toHaveBeenCalledWith(7, '2026-09');
    expect(result.frozen).toBe(false);
    expect(result.balances).toEqual({
      totalBalance: 115_000,
      availableBalance: 130_000,
      liabilitiesBalance: 35_000,
    });
  });

  it.each(['2026-11', '2026-12'])('projects the %s month from the live ledger', async (period) => {
    const result = await service.find('user-public-id', period);

    expect(read.findByPeriod).not.toHaveBeenCalled();
    expect(closing.project).toHaveBeenCalledWith(7, period);
    expect(result).toMatchObject({period, frozen: false, totals: {transactionCount: 3}});
  });

  it('answers 404 for a missing or foreign user without touching either repository', async () => {
    users.findActiveByPublicId.mockResolvedValue(null);

    const error = await service.find('foreign-public-id', '2026-09').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
    expect(read.findByPeriod).not.toHaveBeenCalled();
    expect(closing.project).not.toHaveBeenCalled();
  });
});

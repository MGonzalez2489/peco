import type {AccountType} from '@peco/contracts';
import {AccountTypeEnum, MovementTypeEnum} from '@peco/enums';
import {ApiException} from '../../common/http/api-exception';
import {AccountRepository} from '../../accounts/services/account.repository';
import {UtcClock} from '../../database/clock/utc-clock';
import type {
  AccountEntity,
  AccountPeriodBalanceEntity,
  UserEntity,
} from '../../database/entities';
import type {PeriodLedgerMovement} from '../../periods/types/period-ledger-movement.type';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {AccountProgressionRepository} from './account-progression.repository';
import {AccountProgressionService} from './account-progression.service';

const NOW = '2026-11-05T10:00:00.000Z';
const USER_PUBLIC_ID = 'user-public-id';
const ACCOUNT_PUBLIC_ID = 'account-public-id';

const account = (overrides: Partial<AccountEntity> = {}): AccountEntity =>
  ({
    id: 12,
    publicId: ACCOUNT_PUBLIC_ID,
    userId: 7,
    name: 'Efectivo',
    type: AccountTypeEnum.CASH.toString(),
    initialBalance: 100_000,
    currentBalance: 150_000,
    creditLimit: null,
    color: '#10B981',
    icon: 'banknote',
    ...overrides,
  }) as AccountEntity;

const frozenBalance = (
  overrides: Partial<AccountPeriodBalanceEntity> = {},
): AccountPeriodBalanceEntity =>
  ({
    id: 42,
    snapshotId: 3,
    accountId: 12,
    accountName: 'Efectivo congelado',
    accountType: AccountTypeEnum.CASH.toString(),
    color: '#22C55E',
    icon: 'wallet',
    initialBalance: 100_000,
    finalBalance: 150_000,
    ...overrides,
  }) as AccountPeriodBalanceEntity;

const movement = (
  id: number,
  type: string,
  amount: number,
  date: string,
  overrides: Partial<PeriodLedgerMovement> = {},
): PeriodLedgerMovement =>
  ({
    id,
    date,
    type: type as PeriodLedgerMovement['type'],
    amount,
    accountId: 12,
    targetAccountId: null,
    isCanceled: false,
    ...overrides,
  }) as PeriodLedgerMovement;

describe('AccountProgressionService (US-802)', () => {
  let users: {findActiveByPublicId: jest.Mock};
  let accounts: {findActiveByPublicId: jest.Mock};
  let progression: {
    findFrozenBalance: jest.Mock;
    findOpeningBalance: jest.Mock;
    findPeriodMovements: jest.Mock;
  };
  let service: AccountProgressionService;

  beforeEach(() => {
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7} as UserEntity)};
    accounts = {findActiveByPublicId: jest.fn().mockResolvedValue(account())};
    progression = {
      findFrozenBalance: jest.fn().mockResolvedValue(null),
      findOpeningBalance: jest.fn().mockResolvedValue(100_000),
      findPeriodMovements: jest.fn().mockResolvedValue([]),
    };
    service = new AccountProgressionService(
      users as unknown as UserProfileRepository,
      accounts as unknown as AccountRepository,
      progression as unknown as AccountProgressionRepository,
      {now: () => NOW} as UtcClock,
    );
  });

  it('uses the frozen opening and final balance for a closed month', async () => {
    progression.findFrozenBalance.mockResolvedValue(frozenBalance());
    progression.findPeriodMovements.mockResolvedValue([
      movement(1, MovementTypeEnum.INCOME.toString(), 60_000, '2026-09-12T10:00:00.000Z'),
      movement(2, MovementTypeEnum.EXPENSE.toString(), 10_000, '2026-09-18T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, ACCOUNT_PUBLIC_ID, '2026-09');

    expect(users.findActiveByPublicId).toHaveBeenCalledWith(USER_PUBLIC_ID);
    expect(accounts.findActiveByPublicId).toHaveBeenCalledWith(7, ACCOUNT_PUBLIC_ID);
    expect(progression.findFrozenBalance).toHaveBeenCalledWith(7, 12, '2026-09');
    expect(progression.findOpeningBalance).not.toHaveBeenCalled();
    expect(result).toEqual({
      period: '2026-09',
      account: {
        publicId: ACCOUNT_PUBLIC_ID,
        name: 'Efectivo congelado',
        type: AccountTypeEnum.CASH.toString(),
        color: '#22C55E',
        icon: 'wallet',
      },
      initialBalance: 100_000,
      finalBalance: 150_000,
      creditUsage: null,
      points: [
        {date: '2026-09-01', balance: 100_000},
        {date: '2026-09-12', balance: 160_000},
        {date: '2026-09-18', balance: 150_000},
      ],
    });
  });

  it('reconstructs the opening from the ledger and closes on the live balance', async () => {
    progression.findPeriodMovements.mockResolvedValue([
      movement(1, MovementTypeEnum.INCOME.toString(), 70_000, '2026-11-12T10:00:00.000Z'),
      movement(
        2,
        MovementTypeEnum.EXPENSE.toString(),
        20_000,
        '2026-11-12T12:00:00.000Z',
        {isCanceled: true},
      ),
    ]);

    const result = await service.find(USER_PUBLIC_ID, ACCOUNT_PUBLIC_ID, '2026-11');

    expect(progression.findFrozenBalance).not.toHaveBeenCalled();
    expect(progression.findOpeningBalance).toHaveBeenCalledWith(7, 12, '2026-11');
    expect(result.initialBalance).toBe(100_000);
    expect(result.finalBalance).toBe(150_000);
    expect(result.points).toEqual([
      {date: '2026-11-01', balance: 100_000},
      {date: '2026-11-12', balance: 150_000},
    ]);
  });

  it('uses the projected final balance for a future month', async () => {
    progression.findOpeningBalance.mockResolvedValue(80_000);
    progression.findPeriodMovements.mockResolvedValue([
      movement(1, MovementTypeEnum.INCOME.toString(), 25_000, '2026-12-04T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, ACCOUNT_PUBLIC_ID, '2026-12');

    expect(result.finalBalance).toBe(105_000);
    expect(result.points[result.points.length - 1]).toEqual({
      date: '2026-12-04',
      balance: 105_000,
    });
  });

  it('reports credit usage from the closing balance', async () => {
    accounts.findActiveByPublicId.mockResolvedValue(
      account({
        type: AccountTypeEnum.CREDIT.toString() as AccountType,
        creditLimit: 500_000,
        currentBalance: -120_000,
      }),
    );
    progression.findOpeningBalance.mockResolvedValue(-100_000);
    progression.findPeriodMovements.mockResolvedValue([
      movement(1, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-08T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, ACCOUNT_PUBLIC_ID, '2026-11');

    expect(result.finalBalance).toBe(-120_000);
    expect(result.creditUsage).toEqual({
      limit: 500_000,
      used: 120_000,
      available: 380_000,
      availablePercentage: 76,
    });
  });

  it.each([
    ['user', () => users.findActiveByPublicId.mockResolvedValue(null)],
    ['account', () => accounts.findActiveByPublicId.mockResolvedValue(null)],
  ])('answers 404 for a missing or foreign %s', async (_label, arrange) => {
    arrange();

    const error = await service
      .find('foreign-public-id', ACCOUNT_PUBLIC_ID, '2026-11')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
    expect(progression.findFrozenBalance).not.toHaveBeenCalled();
    expect(progression.findOpeningBalance).not.toHaveBeenCalled();
    expect(progression.findPeriodMovements).not.toHaveBeenCalled();
  });
});

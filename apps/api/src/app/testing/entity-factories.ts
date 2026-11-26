import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import type {DataSource} from 'typeorm';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../database/entities';

let sequence = 0;

const nextEmail = (label: string): string => `${label}-${++sequence}@example.com`;

/** Valid defaults with explicit overrides, so a fixture states only its business condition. */
export const createUser = (
  dataSource: DataSource,
  overrides: Partial<UserEntity> = {},
): Promise<UserEntity> => {
  const repository = dataSource.getRepository(UserEntity);
  return repository.save(
    repository.create({
      email: nextEmail('e2e'),
      passwordHash: 'test-password-hash',
      name: 'Usuario de prueba',
      lastActiveAt: null,
      deletedAt: null,
      ...overrides,
    }),
  );
};

export const createAccount = (
  dataSource: DataSource,
  user: UserEntity,
  overrides: Partial<AccountEntity> = {},
): Promise<AccountEntity> => {
  const repository = dataSource.getRepository(AccountEntity);
  return repository.save(
    repository.create({
      userId: user.id,
      name: 'Efectivo',
      type: AccountTypeEnum.CASH.toString(),
      initialBalance: 0,
      currentBalance: 0,
      includeInTotal: true,
      targetGoal: null,
      creditLimit: null,
      color: null,
      icon: null,
      pinToHome: false,
      isRoot: false,
      note: null,
      version: 0,
      deletedAt: null,
      ...overrides,
    }),
  );
};

export const createCategory = (
  dataSource: DataSource,
  user: UserEntity | null,
  overrides: Partial<CategoryEntity> = {},
): Promise<CategoryEntity> => {
  const repository = dataSource.getRepository(CategoryEntity);
  return repository.save(
    repository.create({
      userId: user?.id ?? null,
      name: nextEmail('category').replace('@example.com', ''),
      displayName: 'Prueba',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
      icon: 'tag',
      color: '#F97316',
      isRoot: false,
      isSystem: false,
      deletedAt: null,
      ...overrides,
    }),
  );
};

export const createMovement = (
  dataSource: DataSource,
  user: UserEntity,
  account: AccountEntity,
  category: CategoryEntity,
  overrides: Partial<MovementEntity> = {},
): Promise<MovementEntity> => {
  const repository = dataSource.getRepository(MovementEntity);
  return repository.save(
    repository.create({
      userId: user.id,
      accountId: account.id,
      targetAccountId: null,
      categoryId: category.id,
      type: MovementTypeEnum.INCOME.toString(),
      amount: 1000,
      date: '2026-01-15T12:00:00.000Z',
      note: null,
      reversalId: null,
      replacesMovementId: null,
      isReversal: false,
      isReversed: false,
      isCanceled: false,
      scheduledTransactionId: null,
      version: 0,
      deletedAt: null,
      ...overrides,
    }),
  );
};

export const createSchedule = (
  dataSource: DataSource,
  user: UserEntity,
  account: AccountEntity,
  category: CategoryEntity,
  overrides: Partial<ScheduledTransactionEntity> = {},
): Promise<ScheduledTransactionEntity> => {
  const repository = dataSource.getRepository(ScheduledTransactionEntity);
  return repository.save(
    repository.create({
      userId: user.id,
      name: 'Renta',
      estimatedAmount: 50_000,
      type: ScheduledTransactionTypeEnum.EXPENSE.toString(),
      categoryId: category.id,
      sourceAccountId: account.id,
      destinationAccountId: null,
      frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
      interval: 1,
      anchorDate: '2026-01-31',
      nextContemplatedDate: '2026-01-31',
      nextExecutionDate: '2026-01-30',
      autoApply: false,
      active: true,
      totalOccurrences: null,
      completedOccurrences: 0,
      endDate: null,
      version: 0,
      deletedAt: null,
      ...overrides,
    }),
  );
};

/** Seeds a closed period without going through the closing job. */
export const createClosedPeriod = (
  dataSource: DataSource,
  user: UserEntity,
  period: string,
): Promise<PeriodSnapshotEntity> => {
  const repository = dataSource.getRepository(PeriodSnapshotEntity);
  return repository.save(
    repository.create({
      userId: user.id,
      period,
      startDate: `${period}-01`,
      endDate: new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5)), 0))
        .toISOString()
        .slice(0, 10),
      globalInitialBalance: 0,
      globalFinalBalance: 0,
      totalInflows: 0,
      totalOutflows: 0,
      totalTransfers: 0,
      totalTransactionsCount: 0,
    }),
  );
};

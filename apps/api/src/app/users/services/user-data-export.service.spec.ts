import {
  AccountTypeEnum,
  AppThemeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import type {UserDataExport} from '@peco/contracts';
import {Readable} from 'node:stream';
import {EnvelopeStream} from '../../common/http/envelope-stream';
import {UtcClock} from '../../database/clock/utc-clock';
import type {
  AccountEntity,
  AccountPeriodBalanceEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../../database/entities';
import {UserProfileRepository} from './user-profile.repository';
import {UserDataExportRepository} from './user-data-export.repository';
import {UserDataExportService} from './user-data-export.service';

const EXPORTED_AT = '2026-11-20T12:00:00.000Z';
const USER_PUBLIC_ID = 'user-public-id';
const ACCOUNT_PUBLIC_ID = 'account-public-id';
const CATEGORY_PUBLIC_ID = 'category-public-id';
const SCHEDULE_PUBLIC_ID = 'schedule-public-id';
const MOVEMENT_PUBLIC_ID = 'movement-public-id';
const SNAPSHOT_PUBLIC_ID = 'snapshot-public-id';

const user = {
  id: 1,
  publicId: USER_PUBLIC_ID,
  email: 'user@example.com',
  name: 'Manuel',
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
} as unknown as UserEntity;

const account = {
  id: 10,
  publicId: ACCOUNT_PUBLIC_ID,
  name: 'Efectivo',
  type: AccountTypeEnum.CASH.toString(),
  initialBalance: 100000,
  currentBalance: 150000,
  includeInTotal: true,
  targetGoal: null,
  creditLimit: null,
  color: '#10B981',
  icon: 'banknote',
  pinToHome: false,
  isRoot: true,
  note: null,
  version: 3,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
} as unknown as AccountEntity;

const category = {
  id: 20,
  publicId: CATEGORY_PUBLIC_ID,
  name: 'comida',
  displayName: 'Comida',
  icon: 'utensils',
  color: '#F97316',
  applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
  isRoot: false,
  isSystem: false,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
} as unknown as CategoryEntity;

const movement = {
  id: 30,
  publicId: MOVEMENT_PUBLIC_ID,
  userId: 1,
  accountId: account.id,
  targetAccountId: null,
  categoryId: category.id,
  type: MovementTypeEnum.EXPENSE.toString(),
  amount: 45000,
  date: '2026-11-12T15:04:05.123Z',
  note: 'Supermercado',
  reversalId: null,
  replacesMovementId: null,
  isReversal: false,
  isReversed: false,
  isCanceled: false,
  scheduledTransactionId: 40,
  version: 0,
  createdAt: '2026-11-12T15:04:05.123Z',
  updatedAt: '2026-11-12T15:04:05.123Z',
  deletedAt: null,
} as unknown as MovementEntity;

const schedule = {
  id: 40,
  publicId: SCHEDULE_PUBLIC_ID,
  name: 'Renta',
  estimatedAmount: 800000,
  type: ScheduledTransactionTypeEnum.EXPENSE.toString(),
  categoryId: category.id,
  sourceAccountId: account.id,
  destinationAccountId: null,
  frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
  interval: 1,
  anchorDate: '2026-12-01',
  nextContemplatedDate: '2026-12-01',
  nextExecutionDate: '2026-12-01',
  autoApply: true,
  active: true,
  totalOccurrences: null,
  completedOccurrences: 3,
  endDate: null,
  version: 2,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-02T00:00:00.000Z',
  deletedAt: null,
} as unknown as ScheduledTransactionEntity;

const execution = {
  id: 50,
  publicId: 'execution-public-id',
  scheduledTransactionId: schedule.id,
  contemplatedDate: '2026-12-01',
  occurrenceDate: '2026-12-01',
  movementId: movement.id,
  status: ScheduledExecutionStatusEnum.APPLIED.toString(),
  reason: null,
  attempts: 0,
  createdAt: '2026-12-01T08:00:00.000Z',
} as unknown as ScheduledExecutionEntity;

const snapshot = {
  id: 60,
  publicId: SNAPSHOT_PUBLIC_ID,
  period: '2026-11',
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  globalInitialBalance: 100000,
  globalFinalBalance: 150000,
  totalInflows: 300000,
  totalOutflows: 45000,
  totalTransfers: 0,
  totalTransactionsCount: 18,
  createdAt: '2026-12-01T00:00:00.000Z',
} as unknown as PeriodSnapshotEntity;

const accountBalance = {
  id: 70,
  publicId: 'balance-public-id',
  snapshotId: snapshot.id,
  accountId: account.id,
  accountName: 'Efectivo',
  accountType: AccountTypeEnum.CASH.toString(),
  color: '#10B981',
  icon: 'banknote',
  includeInTotal: true,
  initialBalance: 100000,
  finalBalance: 150000,
  totalTransactions: 6,
  totalInflows: 80000,
  totalOutflows: 30000,
  totalTransfers: 0,
} as unknown as AccountPeriodBalanceEntity;

const collect = async (stream: EnvelopeStream): Promise<string> => {
  let text = '';
  for await (const chunk of stream) {
    text += String(chunk);
  }
  return text;
};

const collectKeys = (value: unknown, keys: Set<string>): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return;
  }
  if (typeof value !== 'object' || value === null) {
    return;
  }

  for (const [key, nested] of Object.entries(value)) {
    keys.add(key);
    collectKeys(nested, keys);
  }
};

describe('UserDataExportService (US-209)', () => {
  const profile = {findActiveByPublicId: jest.fn()};
  const repository = {
    findPreferences: jest.fn(),
    findAccountBalancesBySnapshot: jest.fn(),
    findAccountPublicIds: jest.fn(),
    findCategoryPublicIds: jest.fn(),
    findMovementPublicIds: jest.fn(),
    findScheduledTransactionPublicIds: jest.fn(),
    streamAccounts: jest.fn(),
    streamCategories: jest.fn(),
    streamMovements: jest.fn(),
    streamScheduledTransactions: jest.fn(),
    streamScheduledExecutions: jest.fn(),
    streamPeriodSnapshots: jest.fn(),
  };
  const clock = {now: jest.fn(() => EXPORTED_AT)};
  const service = new UserDataExportService(
    profile as unknown as UserProfileRepository,
    repository as unknown as UserDataExportRepository,
    clock as unknown as UtcClock,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    profile.findActiveByPublicId.mockResolvedValue(user);
    repository.findPreferences.mockResolvedValue(null);
    repository.findAccountBalancesBySnapshot.mockResolvedValue(
      new Map([[SNAPSHOT_PUBLIC_ID, [accountBalance]]]),
    );
    repository.findAccountPublicIds.mockResolvedValue(new Map([[account.id, account.publicId]]));
    repository.findCategoryPublicIds.mockResolvedValue(
      new Map([[category.id, category.publicId]]),
    );
    repository.findMovementPublicIds.mockResolvedValue(
      new Map([[movement.id, movement.publicId]]),
    );
    repository.findScheduledTransactionPublicIds.mockResolvedValue(
      new Map([[schedule.id, schedule.publicId]]),
    );
    repository.streamAccounts.mockResolvedValue(Readable.from([account]));
    repository.streamCategories.mockResolvedValue(Readable.from([category]));
    repository.streamMovements.mockResolvedValue(Readable.from([movement]));
    repository.streamScheduledTransactions.mockResolvedValue(Readable.from([schedule]));
    repository.streamScheduledExecutions.mockResolvedValue(Readable.from([execution]));
    repository.streamPeriodSnapshots.mockResolvedValue(Readable.from([snapshot]));
  });

  it('streams a self-describing envelope with public ids, cents and default preferences', async () => {
    const stream = await service.exportData(USER_PUBLIC_ID);
    const envelope = JSON.parse(await collect(stream)) as {
      data: UserDataExport;
      error: null;
    };

    expect(envelope.error).toBeNull();
    expect(envelope).not.toHaveProperty('meta');
    expect(envelope.data.exportedAt).toBe(EXPORTED_AT);
    expect(envelope.data.schemaVersion).toBe(1);
    expect(envelope.data.preferences).toEqual({
      theme: AppThemeEnum.LIGHT.toString(),
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: false},
      movements: {hideReversal: true},
    });
    expect(envelope.data.accounts[0].currentBalance).toBe(150000);
    expect(envelope.data.movements[0]).toMatchObject({
      accountPublicId: ACCOUNT_PUBLIC_ID,
      categoryPublicId: CATEGORY_PUBLIC_ID,
      scheduledTransactionPublicId: SCHEDULE_PUBLIC_ID,
      amount: 45000,
    });
    expect(envelope.data.periodSnapshots[0].accountBalances[0].accountPublicId).toBe(
      ACCOUNT_PUBLIC_ID,
    );
    expect(envelope.data.scheduledExecutions[0].movementPublicId).toBe(MOVEMENT_PUBLIC_ID);

    const keys = new Set<string>();
    collectKeys(envelope, keys);
    expect(keys.has('id')).toBe(false);
    expect(keys.has('passwordHash')).toBe(false);
    expect(keys.has('tokenHash')).toBe(false);
    expect(keys.has('auditLogs')).toBe(false);
  });

  it('exports the stored preferences when the row exists', async () => {
    const preferences = {
      id: 80,
      publicId: 'preferences-public-id',
      userId: user.id,
      theme: AppThemeEnum.DARK.toString(),
      pwaBannerDismissedAt: null,
      hideBalance: true,
      hideReversal: false,
      createdAt: '2026-11-01T00:00:00.000Z',
      updatedAt: '2026-11-19T00:00:00.000Z',
      deletedAt: null,
    } as unknown as UserPreferencesEntity;
    repository.findPreferences.mockResolvedValue(preferences);

    const stream = await service.exportData(USER_PUBLIC_ID);
    const envelope = JSON.parse(await collect(stream)) as {data: UserDataExport; error: null};

    expect(envelope.error).toBeNull();
    expect(envelope.data.preferences).toEqual({
      theme: AppThemeEnum.DARK.toString(),
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: true},
      movements: {hideReversal: false},
      updatedAt: '2026-11-19T00:00:00.000Z',
    });
  });

  it('rejects a soft-deleted user before starting the stream', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.exportData(USER_PUBLIC_ID)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(repository.streamAccounts).not.toHaveBeenCalled();
  });
});

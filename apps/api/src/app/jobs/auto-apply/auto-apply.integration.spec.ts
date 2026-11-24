import type {CreateScheduledTransactionRequest} from '@peco/contracts';
import {
  AccountTypeEnum,
  ApiErrorCodeEnum,
  CategoryApplyTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledExecutionReasonEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, type DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../../config/app-config';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import {createTypeOrmOptions} from '../../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../../database/entities';
import {MovementCreationRepository} from '../../movements/services/movement-creation.repository';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {ScheduledTransactionsService} from '../../scheduled-transactions/scheduled-transactions.service';
import {ScheduledExecutionRepository} from '../../scheduled-transactions/services/scheduled-execution.repository';
import {ScheduledTransactionCreationRepository} from '../../scheduled-transactions/services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from '../../scheduled-transactions/services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from '../../scheduled-transactions/services/scheduled-transaction-update.repository';
import {AutoApplyRepository} from './services/auto-apply.repository';
import {AutoApplyService} from './services/auto-apply.service';

jest.setTimeout(180_000);

const NOW = '2026-11-23T00:05:00.000Z';
const OLD = '2026-01-01T00:00:00.000Z';

describe('nightly auto-apply (MySQL 8, US-607)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: AutoApplyService;
  let schedules: ScheduledTransactionsService;

  const seedUser = async (email: string, lastActiveAt: string | null = NOW): Promise<UserEntity> =>
    dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt,
        deletedAt: null,
      }),
    );

  const seedAccount = async (
    user: UserEntity,
    currentBalance = 100_000,
  ): Promise<AccountEntity> =>
    dataSource.getRepository(AccountEntity).save(
      dataSource.getRepository(AccountEntity).create({
        userId: user.id,
        name: 'Efectivo',
        type: AccountTypeEnum.CASH.toString(),
        initialBalance: currentBalance,
        currentBalance,
        includeInTotal: true,
        targetGoal: null,
        creditLimit: null,
        color: '#10B981',
        icon: 'banknote',
        pinToHome: false,
        isRoot: false,
        note: null,
        version: 0,
        deletedAt: null,
      }),
    );

  const seedCategory = async (): Promise<CategoryEntity> =>
    dataSource.getRepository(CategoryEntity).save(
      dataSource.getRepository(CategoryEntity).create({
        userId: null,
        name: `categoria-${Math.random().toString(36).slice(2, 10)}`,
        displayName: 'Servicios',
        icon: 'zap',
        color: '#F59E0B',
        applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
        isRoot: false,
        isSystem: false,
        deletedAt: null,
      }),
    );

  const createSchedule = async (
    user: UserEntity,
    account: AccountEntity,
    category: CategoryEntity,
    overrides: Partial<CreateScheduledTransactionRequest> = {},
  ) => {
    const request: CreateScheduledTransactionRequest = {
      name: 'Renta',
      estimatedAmount: 10_000,
      type: ScheduledTransactionTypeEnum.EXPENSE.toString(),
      categoryPublicId: category.publicId,
      sourceAccountPublicId: account.publicId,
      frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
      interval: 1,
      anchorDate: '2026-11-20',
      autoApply: true,
      totalOccurrences: null,
      endDate: null,
      ...overrides,
    };
    return schedules.create(user.publicId, request);
  };

  const seedClosedPeriod = async (user: UserEntity, period: string): Promise<void> => {
    await dataSource.getRepository(PeriodSnapshotEntity).save(
      dataSource.getRepository(PeriodSnapshotEntity).create({
        userId: user.id,
        period,
        startDate: `${period}-01`,
        endDate: `${period}-30`,
        globalInitialBalance: 0,
        globalFinalBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        totalTransfers: 0,
        totalTransactionsCount: 0,
        createdAt: NOW,
      }),
    );
  };

  beforeAll(async () => {
    container = await new MySqlContainer('mysql:8.4')
      .withDatabase('peco')
      .withUsername('peco')
      .withUserPassword('peco')
      .withRootPassword('root')
      .start();

    const options = createTypeOrmOptions({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      name: container.getDatabase(),
      poolSize: 10,
      healthPingTimeoutMs: 1_000,
    });
    dataSource = new DataSource(options as DataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();

    const clock = new UtcClock();
    jest.spyOn(clock, 'now').mockReturnValue(NOW);
    const config = new ConfigService({
      operational: {
        catchupBatchSize: 500,
        inactiveGraceDays: 7,
        inactiveUserDays: 90,
      },
      jobs: {autoApplyCron: '5 0 * * *'},
    } as AppConfig);
    const queries = new ScheduledTransactionQueryRepository(dataSource);
    schedules = new ScheduledTransactionsService(
      new UserProfileRepository(dataSource),
      new ScheduledTransactionCreationRepository(dataSource),
      queries,
      new ScheduledTransactionUpdateRepository(dataSource, queries, clock),
      new ScheduledExecutionRepository(dataSource, new MovementCreationRepository(dataSource, clock), clock),
      clock,
      config,
    );
    service = new AutoApplyService(
      config,
      clock,
      new AutoApplyRepository(dataSource),
      schedules,
    );
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM scheduledExecutions');
    await dataSource.query('DELETE FROM movements');
    await dataSource.query('DELETE FROM scheduledTransactions');
    await dataSource.query('DELETE FROM periodSnapshots');
    await dataSource.query('DELETE FROM accounts');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM users');
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('applies only due auto-apply schedules of recently active users', async () => {
    const active = await seedUser('auto-apply-active@example.com');
    const inactive = await seedUser('auto-apply-inactive@example.com', OLD);
    const account = await seedAccount(active);
    const inactiveAccount = await seedAccount(inactive);
    const category = await seedCategory();

    await createSchedule(active, account, category);
    await createSchedule(active, account, category, {autoApply: false, name: 'Manual'});
    await createSchedule(inactive, inactiveAccount, category, {name: 'Inactiva'});

    const result = await service.run();

    expect(result).toEqual({
      acquired: true,
      usersProcessed: 1,
      applied: 1,
      skipped: 0,
      failed: 0,
      skippedWhileInactive: 0,
      errors: 0,
      cappedUserPublicIds: [],
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);

    const replay = await service.run();
    expect(replay.applied).toBe(0);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
  });

  it('pauses a schedule after three failed attempts and keeps the failed row', async () => {
    const user = await seedUser('auto-apply-failed@example.com');
    const account = await seedAccount(user, 0);
    const category = await seedCategory();
    const created = await createSchedule(user, account, category);

    await service.run();
    await service.run();
    const third = await service.run();

    expect(third.failed).toBe(1);
    const stored = await dataSource
      .getRepository(ScheduledTransactionEntity)
      .findOneByOrFail({publicId: created.publicId});
    expect(stored.active).toBe(false);
    const execution = await dataSource.getRepository(ScheduledExecutionEntity).findOneByOrFail({
      scheduledTransactionId: stored.id,
    });
    expect(execution).toMatchObject({
      status: ScheduledExecutionStatusEnum.FAILED.toString(),
      reason: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
      attempts: 3,
      movementId: null,
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('converts a failed occurrence to PERIOD_CLOSED when the month closes before the retry', async () => {
    const user = await seedUser('auto-apply-closed@example.com');
    const account = await seedAccount(user, 0);
    const category = await seedCategory();
    const created = await createSchedule(user, account, category, {name: 'Cierre'});

    await service.run();
    await seedClosedPeriod(user, '2026-11');
    await service.run();

    const stored = await dataSource
      .getRepository(ScheduledTransactionEntity)
      .findOneByOrFail({publicId: created.publicId});
    const execution = await dataSource.getRepository(ScheduledExecutionEntity).findOneByOrFail({
      scheduledTransactionId: stored.id,
    });
    expect(execution).toMatchObject({
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      reason: ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
      attempts: 1,
      movementId: null,
    });
    expect(stored.nextExecutionDate).toBe('2026-12-20');
    expect(execution.reason).not.toBe(ScheduledExecutionReasonEnum.INACTIVE_USER.toString());
  });
});

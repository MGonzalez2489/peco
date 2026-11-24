import type {CreateScheduledTransactionRequest} from '@peco/contracts';
import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
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
  UserEntity,
} from '../../database/entities';
import {ReconciliationAlertService} from '../reconciliation/services/reconciliation-alert.service';
import {ReconciliationMetricsService} from '../reconciliation/services/reconciliation-metrics.service';
import {ReconciliationRepository} from '../reconciliation/services/reconciliation.repository';
import {ReconciliationService} from '../reconciliation/services/reconciliation.service';
import {MovementCreationRepository} from '../../movements/services/movement-creation.repository';
import {PeriodClosingRepository} from '../../periods/services/period-closing.repository';
import {PeriodClosingService} from '../../periods/services/period-closing.service';
import {ScheduledTransactionsService} from '../../scheduled-transactions/scheduled-transactions.service';
import {ScheduledTransactionCreationRepository} from '../../scheduled-transactions/services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from '../../scheduled-transactions/services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from '../../scheduled-transactions/services/scheduled-transaction-update.repository';
import {ScheduledExecutionRepository} from '../../scheduled-transactions/services/scheduled-execution.repository';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {AutoApplyRepository} from '../auto-apply/services/auto-apply.repository';
import {AutoApplyService} from '../auto-apply/services/auto-apply.service';
import {PeriodCloseJobService} from './services/period-close-job.service';
import {PeriodCloseRepository} from './services/period-close.repository';

jest.setTimeout(180_000);

const REGISTRATION = '2026-08-01T00:00:00.000Z';
const OLD = '2026-01-01T00:00:00.000Z';
const NOW_AUTO = '2026-11-05T00:05:00.000Z';
const NOW_CLOSE = '2026-11-05T00:10:00.000Z';
const NOW_RECONCILE = '2026-11-05T03:00:00.000Z';

describe('period-closing job (MySQL 8, US-704)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let clock: UtcClock;
  let now: string;
  let schedules: ScheduledTransactionsService;
  let autoApply: AutoApplyService;
  let job: PeriodCloseJobService;
  let reconciliation: ReconciliationService;

  const buildConfig = (catchupBatchSize = 500): ConfigService =>
    new ConfigService({
      operational: {
        catchupBatchSize,
        inactiveGraceDays: 7,
        inactiveUserDays: 90,
        maxBackfillMonths: 120,
      },
      jobs: {
        autoApplyCron: '5 0 * * *',
        periodCloseCron: '10 0 * * *',
        reconciliationCron: '0 3 * * *',
      },
    } as AppConfig);

  const buildServices = (catchupBatchSize = 500) => {
    const config = buildConfig(catchupBatchSize);
    const queries = new ScheduledTransactionQueryRepository(dataSource);
    const builtSchedules = new ScheduledTransactionsService(
      new UserProfileRepository(dataSource),
      new ScheduledTransactionCreationRepository(dataSource),
      queries,
      new ScheduledTransactionUpdateRepository(dataSource, queries, clock),
      new ScheduledExecutionRepository(
        dataSource,
        new MovementCreationRepository(dataSource, clock),
        clock,
      ),
      clock,
      config,
    );
    const builtAutoApply = new AutoApplyService(
      config,
      clock,
      new AutoApplyRepository(dataSource),
      builtSchedules,
    );
    const closing = new PeriodClosingService(
      new PeriodClosingRepository(dataSource),
      new UserProfileRepository(dataSource),
      clock,
      config,
    );

    schedules = builtSchedules;
    autoApply = builtAutoApply;
    job = new PeriodCloseJobService(
      new PeriodCloseRepository(dataSource),
      closing,
      autoApply,
      clock,
      config,
    );
    return {autoApply, job};
  };

  const seedUser = async (
    email: string,
    createdAt = REGISTRATION,
    lastActiveAt = NOW_CLOSE,
  ): Promise<UserEntity> => {
    const users = dataSource.getRepository(UserEntity);
    const user = await users.save(
      users.create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt,
        deletedAt: null,
      }),
    );
    await users.update({id: user.id}, {createdAt});
    return users.findOneByOrFail({id: user.id});
  };

  const seedAccount = async (
    user: UserEntity,
    currentBalance = 100_000,
  ): Promise<AccountEntity> => {
    const accounts = dataSource.getRepository(AccountEntity);
    const account = await accounts.save(
      accounts.create({
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
    await accounts.update({id: account.id}, {createdAt: REGISTRATION});
    return accounts.findOneByOrFail({id: account.id});
  };

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

  const seedMovement = async (
    user: UserEntity,
    account: AccountEntity,
    category: CategoryEntity,
    date: string,
  ): Promise<MovementEntity> =>
    dataSource.getRepository(MovementEntity).save(
      dataSource.getRepository(MovementEntity).create({
        userId: user.id,
        accountId: account.id,
        targetAccountId: null,
        categoryId: category.id,
        type: MovementTypeEnum.INCOME.toString(),
        amount: 5_000,
        date,
        note: null,
        reversalId: null,
        replacesMovementId: null,
        isReversal: false,
        isReversed: false,
        isCanceled: false,
        scheduledTransactionId: null,
        version: 0,
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
      anchorDate: '2026-10-20',
      autoApply: true,
      totalOccurrences: null,
      endDate: null,
      ...overrides,
    };
    return schedules.create(user.publicId, request);
  };

  const snapshotsFor = (user: UserEntity): Promise<PeriodSnapshotEntity[]> =>
    dataSource.getRepository(PeriodSnapshotEntity).find({
      where: {userId: user.id},
      order: {period: 'ASC'},
    });

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

    now = NOW_CLOSE;
    clock = new UtcClock();
    jest.spyOn(clock, 'now').mockImplementation(() => now);
    buildServices();

    const config = buildConfig();
    reconciliation = new ReconciliationService(
      config,
      clock,
      new ReconciliationRepository(dataSource),
      new ReconciliationMetricsService(),
      new ReconciliationAlertService(),
    );
  });

  beforeEach(async () => {
    const tables = dataSource.entityMetadatas.map(({tableName}) => `\`${tableName}\``);
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of tables) {
        await runner.query(`DELETE FROM ${table}`);
      }
      await runner.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await runner.release();
    }
    buildServices();
    now = NOW_CLOSE;
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('defers until auto-apply ran, then freezes the occurrences it applied', async () => {
    const user = await seedUser('order@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory();
    await createSchedule(user, account, category);

    await expect(job.run('cron')).resolves.toMatchObject({deferred: true, closed: 0});
    expect(await snapshotsFor(user)).toHaveLength(0);

    now = NOW_AUTO;
    const applied = await autoApply.run();
    expect(applied.applied).toBe(1);
    const movement = await dataSource.getRepository(MovementEntity).findOneByOrFail({
      userId: user.id,
    });
    expect(movement.date).toBe('2026-10-20T00:00:00.000Z');

    now = NOW_CLOSE;
    const closed = await job.run('cron');
    expect(closed).toMatchObject({
      acquired: true,
      deferred: false,
      usersProcessed: 1,
      closed: 3,
      errors: 0,
    });

    const snapshot = await dataSource.getRepository(PeriodSnapshotEntity).findOneByOrFail({
      userId: user.id,
      period: '2026-10',
    });
    expect(snapshot).toMatchObject({
      globalInitialBalance: 100_000,
      globalFinalBalance: 90_000,
      totalOutflows: 10_000,
      totalTransactionsCount: 1,
    });

    const replay = await job.run('cron');
    expect(replay).toMatchObject({closed: 0, truncated: 0, errors: 0});
    expect(await snapshotsFor(user)).toHaveLength(3);

    now = NOW_RECONCILE;
    await expect(reconciliation.reconcile()).resolves.toMatchObject({acquired: true});
    const afterReconciliation = await dataSource.getRepository(PeriodSnapshotEntity).findOneByOrFail({
      id: snapshot.id,
    });
    expect(afterReconciliation).toMatchObject({
      globalFinalBalance: snapshot.globalFinalBalance,
      totalOutflows: snapshot.totalOutflows,
      createdAt: snapshot.createdAt,
    });
  });

  it('postpones a capped auto-apply user for one close run only', async () => {
    buildServices(1);
    const user = await seedUser('capped@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory();
    await createSchedule(user, account, category, {
      anchorDate: '2026-08-20',
      name: 'Backlog',
      totalOccurrences: 3,
    });

    now = NOW_AUTO;
    const applied = await autoApply.run();
    expect(applied.cappedUserPublicIds).toEqual([user.publicId]);

    now = NOW_CLOSE;
    const first = await job.run('cron');
    expect(first).toMatchObject({postponed: 1, closed: 0, usersProcessed: 1});
    expect(await snapshotsFor(user)).toHaveLength(0);

    const second = await job.run('cron');
    expect(second).toMatchObject({postponed: 0, closed: 3, usersProcessed: 1});
    expect(await snapshotsFor(user)).toHaveLength(3);
  });

  it('excludes inactive users and is idempotent on the startup sweep', async () => {
    const active = await seedUser('active@example.com');
    const inactive = await seedUser('inactive@example.com', REGISTRATION, OLD);
    const account = await seedAccount(active);
    const inactiveAccount = await seedAccount(inactive);
    const category = await seedCategory();
    await seedMovement(active, account, category, '2026-09-10T12:00:00.000Z');
    await seedMovement(inactive, inactiveAccount, category, '2026-09-10T12:00:00.000Z');

    const first = await job.run('startup');
    const second = await job.run('startup');

    expect(first).toMatchObject({acquired: true, closed: 3, usersProcessed: 1});
    expect(second).toMatchObject({acquired: true, closed: 0, usersProcessed: 1});
    expect(await snapshotsFor(active)).toHaveLength(3);
    expect(await snapshotsFor(inactive)).toHaveLength(0);
  });

  it('keeps each user snapshot isolated to their own ledger', async () => {
    const firstUser = await seedUser('owner-a@example.com');
    const secondUser = await seedUser('owner-b@example.com');
    const firstAccount = await seedAccount(firstUser, 100_000);
    await seedAccount(secondUser, 50_000);
    const category = await seedCategory();
    await seedMovement(firstUser, firstAccount, category, '2026-09-10T12:00:00.000Z');

    await job.run('startup');

    const firstSnapshots = await snapshotsFor(firstUser);
    const secondSnapshots = await snapshotsFor(secondUser);
    expect(firstSnapshots.find(({period}) => period === '2026-09')?.globalFinalBalance).toBe(
      105_000,
    );
    expect(secondSnapshots.find(({period}) => period === '2026-09')?.globalFinalBalance).toBe(
      50_000,
    );
    expect(secondSnapshots.find(({period}) => period === '2026-09')?.totalTransactionsCount).toBe(0);
  });

  it('does nothing when the deleted flag removes the only candidate user', async () => {
    const user = await seedUser('deleted@example.com');
    const users = dataSource.getRepository(UserEntity);
    await users.update({id: user.id}, {deletedAt: NOW_CLOSE});

    const result = await job.run('startup');

    expect(result).toMatchObject({usersProcessed: 0, closed: 0});
    expect(await snapshotsFor(user)).toHaveLength(0);
    expect(await dataSource.getRepository(PeriodSnapshotEntity).count()).toBe(0);
  });

  it('finds only active, non-deleted users in the queue query', async () => {
    const active = await seedUser('query-active@example.com');
    const inactive = await seedUser('query-inactive@example.com', REGISTRATION, OLD);
    const deleted = await seedUser('query-deleted@example.com');
    await dataSource.getRepository(UserEntity).update({id: deleted.id}, {deletedAt: NOW_CLOSE});

    const repository = new PeriodCloseRepository(dataSource);
    const users = await repository.findActiveUserPublicIds('2026-08-07T00:10:00.000Z');

    expect(users).toEqual([{publicId: active.publicId}]);
    expect(users).not.toContainEqual({publicId: inactive.publicId});
  });

  it('uses the dedicated advisory lock name', async () => {
    const repository = new PeriodCloseRepository(dataSource);
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      const held = (await runner.query("SELECT GET_LOCK('peco:period-close', 0) AS acquired")) as {
        acquired: unknown;
      }[];
      expect(Number(held[0]?.acquired)).toBe(1);
      await expect(repository.withLock(async () => 'unreachable')).resolves.toBeNull();
      await runner.query("SELECT RELEASE_LOCK('peco:period-close')");

      const acquiredInside = await repository.withLock(async () => {
        const owners = (await runner.query(
          "SELECT IS_USED_LOCK('peco:period-close') AS owner",
        )) as {owner: unknown}[];
        return Number(owners[0]?.owner) > 0;
      });
      expect(acquiredInside).toBe(true);
    } finally {
      await runner.query("SELECT RELEASE_LOCK('peco:period-close')");
      await runner.release();
    }
  });
});

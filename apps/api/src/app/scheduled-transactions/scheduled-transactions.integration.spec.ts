import type {
  CategoryApplyType,
  CreateScheduledTransactionRequest,
  ListScheduledTransactionsQuery,
} from '@peco/contracts';
import {
  AccountTypeEnum,
  ApiErrorCodeEnum,
  CategoryApplyTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledExecutionReasonEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../config/app-config';
import {ConfigService} from '../config/config.service';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../database/entities';
import {UtcClock} from '../database/clock/utc-clock';
import {MovementCreationRepository} from '../movements/services/movement-creation.repository';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledExecutionRepository} from './services/scheduled-execution.repository';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';

jest.setTimeout(180_000);

const FIXED_NOW = '2026-11-23T12:00:00.000Z';

describe('scheduled transactions (MySQL 8, US-601–US-608)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: ScheduledTransactionsService;
  let buildService: (
    configOverrides?: Partial<AppConfig['operational']>,
  ) => ScheduledTransactionsService;

  const seedUser = async (email: string): Promise<UserEntity> =>
    dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: null,
        deletedAt: null,
      }),
    );

  const seedAccount = async (
    user: UserEntity,
    overrides: Partial<AccountEntity> = {},
  ): Promise<AccountEntity> =>
    dataSource.getRepository(AccountEntity).save(
      dataSource.getRepository(AccountEntity).create({
        userId: user.id,
        name: 'Efectivo',
        type: AccountTypeEnum.CASH.toString(),
        initialBalance: 0,
        currentBalance: 0,
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
        ...overrides,
      }),
    );

  const seedCategory = async (
    user: UserEntity | null,
    applyType: CategoryApplyType,
  ): Promise<CategoryEntity> =>
    dataSource.getRepository(CategoryEntity).save(
      dataSource.getRepository(CategoryEntity).create({
        userId: user?.id ?? null,
        name: `categoria-${Math.random().toString(36).slice(2, 10)}`,
        displayName: 'Servicios',
        icon: 'zap',
        color: '#F59E0B',
        applyType,
        isRoot: false,
        isSystem: false,
        deletedAt: null,
      }),
    );

  const request = (
    overrides: Partial<CreateScheduledTransactionRequest> = {},
  ): CreateScheduledTransactionRequest => ({
    name: 'Renta',
    estimatedAmount: 800000,
    type: ScheduledTransactionTypeEnum.EXPENSE.toString(),
    categoryPublicId: 'missing',
    sourceAccountPublicId: 'missing',
    frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
    interval: 1,
    anchorDate: '2026-12-01',
    autoApply: true,
    totalOccurrences: 12,
    endDate: '2027-11-01',
    ...overrides,
  });

  const listRequest = (
    overrides: Partial<ListScheduledTransactionsQuery> = {},
  ): ListScheduledTransactionsQuery => ({limit: 20, ...overrides});

  const seedExecution = async (
    schedule: ScheduledTransactionEntity,
    contemplatedDate: string,
  ): Promise<ScheduledExecutionEntity> =>
    dataSource.getRepository(ScheduledExecutionEntity).save(
      dataSource.getRepository(ScheduledExecutionEntity).create({
        scheduledTransactionId: schedule.id,
        contemplatedDate,
        occurrenceDate: contemplatedDate,
        movementId: null,
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        reason: null,
        attempts: 0,
        createdAt: '2026-11-23T10:00:00.000Z',
      }),
    );

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
        createdAt: FIXED_NOW,
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

    buildService = (configOverrides = {}) => {
      const queries = new ScheduledTransactionQueryRepository(dataSource);
      const clock = new UtcClock();
      jest.spyOn(clock, 'now').mockReturnValue(FIXED_NOW);
      const creations = new MovementCreationRepository(dataSource, clock);
      const config = new ConfigService({
        operational: {
          catchupBatchSize: 500,
          inactiveGraceDays: 7,
          inactiveUserDays: 90,
          ...configOverrides,
        },
      } as AppConfig);

      return new ScheduledTransactionsService(
        new UserProfileRepository(dataSource),
        new ScheduledTransactionCreationRepository(dataSource),
        queries,
        new ScheduledTransactionUpdateRepository(dataSource, queries, clock),
        new ScheduledExecutionRepository(dataSource, creations, clock),
        clock,
        config,
      );
    };
    service = buildService();
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
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

  it('stores the anchor and derives the applied date for a month-end weekend', async () => {
    const user = await seedUser('grid@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());

    const response = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-01-31',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
      }),
    );

    expect(response).toMatchObject({
      name: 'Renta',
      estimatedAmount: 800000,
      type: 'EXPENSE',
      frequency: 'MONTHLY',
      interval: 1,
      anchorDate: '2026-01-31',
      nextContemplatedDate: '2026-01-31',
      nextExecutionDate: '2026-01-30',
      autoApply: true,
      active: true,
      totalOccurrences: 12,
      completedOccurrences: 0,
      endDate: '2027-11-01',
      version: 0,
    });
    expect(response.category).toEqual({
      publicId: category.publicId,
      displayName: 'Servicios',
      color: '#F59E0B',
      icon: 'zap',
    });
    expect(response.sourceAccount).toEqual({
      publicId: account.publicId,
      name: 'Efectivo',
      type: 'CASH',
      color: '#10B981',
      icon: 'banknote',
    });
    expect(Object.keys(response)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'categoryId', 'sourceAccountId']),
    );

    const stored = await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
      publicId: response.publicId,
    });
    expect(stored).toMatchObject({
      anchorDate: '2026-01-31',
      nextContemplatedDate: '2026-01-31',
      nextExecutionDate: '2026-01-30',
      interval: 1,
      completedOccurrences: 0,
    });
  });

  it('defaults interval and autoApply and accepts a past anchor for catch-up (D111)', async () => {
    const user = await seedUser('past@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(user, CategoryApplyTypeEnum.BOTH.toString());

    const response = await service.create(
      user.publicId,
      request({
        anchorDate: '2020-01-15',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        interval: undefined,
        autoApply: undefined,
        totalOccurrences: undefined,
        endDate: undefined,
      }),
    );

    expect(response).toMatchObject({
      anchorDate: '2020-01-15',
      nextContemplatedDate: '2020-01-15',
      nextExecutionDate: '2020-01-15',
      interval: 1,
      autoApply: false,
      totalOccurrences: null,
      endDate: null,
    });
  });

  it('requires a distinct owned destination for a transfer', async () => {
    const user = await seedUser('transfer@example.com');
    const source = await seedAccount(user, {name: 'Origen'});
    const target = await seedAccount(user, {name: 'Destino'});
    const foreign = await seedUser('foreign@example.com');
    const foreignAccount = await seedAccount(foreign, {name: 'Ajena'});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const transfer = request({
      type: ScheduledTransactionTypeEnum.TRANSFER.toString(),
      categoryPublicId: category.publicId,
      sourceAccountPublicId: source.publicId,
    });

    await expect(service.create(user.publicId, transfer)).rejects.toMatchObject({
      status: 409,
      code: 'TRANSFER_REQUIRED',
    });
    await expect(
      service.create(
        user.publicId,
        request({
          ...transfer,
          destinationAccountPublicId: source.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 422, code: 'UNPROCESSABLE_ENTITY'});
    await expect(
      service.create(
        user.publicId,
        request({
          ...transfer,
          destinationAccountPublicId: foreignAccount.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});

    const response = await service.create(
      user.publicId,
      request({
        ...transfer,
        destinationAccountPublicId: target.publicId,
      }),
    );

    expect(response.destinationAccount).toEqual({
      publicId: target.publicId,
      name: 'Destino',
      type: 'CASH',
      color: '#10B981',
      icon: 'banknote',
    });
    expect(await dataSource.getRepository(ScheduledTransactionEntity).count()).toBe(1);
  });

  it('rejects a category that does not accept the schedule type', async () => {
    const user = await seedUser('category@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.INCOME.toString());

    await expect(
      service.create(
        user.publicId,
        request({
          categoryPublicId: category.publicId,
          sourceAccountPublicId: account.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 422, code: 'CATEGORY_NOT_COMPATIBLE'});

    expect(await dataSource.getRepository(ScheduledTransactionEntity).count()).toBe(0);
  });

  it('does not expose accounts or categories owned by another user', async () => {
    const user = await seedUser('owner@example.com');
    const foreign = await seedUser('other@example.com');
    const account = await seedAccount(foreign);
    const category = await seedCategory(foreign, CategoryApplyTypeEnum.BOTH.toString());

    await expect(
      service.create(
        user.publicId,
        request({
          categoryPublicId: category.publicId,
          sourceAccountPublicId: account.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});

    expect(await dataSource.getRepository(ScheduledTransactionEntity).count()).toBe(0);
  });

  it('lists owned schedules with cursor pagination for the current period', async () => {
    const user = await seedUser('list@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const currentPeriod = FIXED_NOW.slice(0, 7);
    const anchorDate = `${currentPeriod}-15`;

    for (const name of ['Renta A', 'Renta B']) {
      await service.create(
        user.publicId,
        request({name, anchorDate, categoryPublicId: category.publicId, sourceAccountPublicId: account.publicId}),
      );
    }

    const firstPage = await service.list(user.publicId, listRequest({period: currentPeriod, limit: 1}));
    expect(firstPage.items).toHaveLength(1);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await service.list(
      user.publicId,
      listRequest({period: currentPeriod, limit: 1, cursor: firstPage.nextCursor ?? undefined}),
    );
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0].publicId).not.toBe(firstPage.items[0].publicId);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('isolates processed past occurrences from other periods', async () => {
    const user = await seedUser('periods@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2020-01-15',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
      }),
    );
    const stored = await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
      publicId: created.publicId,
    });
    await seedExecution(stored, '2020-06-15');

    const processedPeriod = await service.list(user.publicId, listRequest({period: '2020-06'}));
    expect(processedPeriod.items.map((item) => item.publicId)).toContain(created.publicId);

    const emptyPeriod = await service.list(user.publicId, listRequest({period: '2020-07'}));
    expect(emptyPeriod.items).toHaveLength(0);
  });

  it('returns an owner-scoped detail and rejects foreign schedules', async () => {
    const user = await seedUser('detail@example.com');
    const foreign = await seedUser('foreign-detail@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({categoryPublicId: category.publicId, sourceAccountPublicId: account.publicId}),
    );

    const detail = await service.findOne(user.publicId, created.publicId);
    expect(detail.publicId).toBe(created.publicId);
    await expect(service.findOne(foreign.publicId, created.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('updates a schedule atomically and detects stale versions', async () => {
    const user = await seedUser('update@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({categoryPublicId: category.publicId, sourceAccountPublicId: account.publicId}),
    );

    const updated = await service.update(user.publicId, created.publicId, {
      name: 'Renta actualizada',
      estimatedAmount: 900000,
      version: created.version,
    });
    expect(updated).toMatchObject({
      name: 'Renta actualizada',
      estimatedAmount: 900000,
      version: created.version + 1,
    });
    await expect(
      service.update(user.publicId, created.publicId, {
        name: 'Cambio obsoleto',
        version: created.version,
      }),
    ).rejects.toMatchObject({status: 409, code: 'VERSION_CONFLICT'});
  });

  it('validates endDate against the stored anchor on update', async () => {
    const user = await seedUser('end-date@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-12-01',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
      }),
    );

    await expect(
      service.update(user.publicId, created.publicId, {endDate: '2026-11-30'}),
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {endDate: expect.any(String)}},
    });
  });

  it('skips processed grid points when re-anchoring', async () => {
    const user = await seedUser('reanchor@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2020-01-15',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
      }),
    );
    const stored = await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
      publicId: created.publicId,
    });
    await seedExecution(stored, '2020-01-15');
    await seedExecution(stored, '2020-02-15');
    await seedExecution(stored, '2020-03-15');

    const reAnchored = await service.update(user.publicId, created.publicId, {
      anchorDate: '2020-01-15',
    });
    expect(reAnchored).toMatchObject({
      anchorDate: '2020-01-15',
      nextContemplatedDate: '2020-04-15',
      nextExecutionDate: '2020-04-15',
      version: created.version + 1,
    });
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(3);
  });

  it('pauses and resumes without writing execution rows or back-billing paused time', async () => {
    const user = await seedUser('toggle@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2020-01-15',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: undefined,
        endDate: undefined,
      }),
    );
    const stored = await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
      publicId: created.publicId,
    });
    await seedExecution(stored, '2020-01-15');

    const paused = await service.toggle(user.publicId, created.publicId, {
      active: false,
      version: created.version,
    });
    expect(paused).toMatchObject({
      active: false,
      nextContemplatedDate: '2020-01-15',
      nextExecutionDate: '2020-01-15',
      version: created.version + 1,
    });

    const resumed = await service.toggle(user.publicId, created.publicId, {
      active: true,
      version: paused.version,
    });
    expect(resumed).toMatchObject({
      active: true,
      nextContemplatedDate: '2026-12-15',
      nextExecutionDate: '2026-12-15',
      version: paused.version + 1,
    });
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
  });

  it('keeps a schedule finished by endDate inactive when resumed', async () => {
    const user = await seedUser('toggle-end-date@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-10-01',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        endDate: '2026-11-01',
      }),
    );

    const resumed = await service.toggle(user.publicId, created.publicId, {
      active: true,
      version: created.version,
    });

    expect(resumed).toMatchObject({
      active: false,
      nextContemplatedDate: '2026-10-01',
      nextExecutionDate: '2026-10-01',
      version: created.version + 1,
    });
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(0);
  });

  it('rejects a stale toggle version without changing the stored schedule', async () => {
    const user = await seedUser('toggle-version@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({categoryPublicId: category.publicId, sourceAccountPublicId: account.publicId}),
    );

    await service.toggle(user.publicId, created.publicId, {
      active: false,
      version: created.version,
    });
    await expect(
      service.toggle(user.publicId, created.publicId, {
        active: true,
        version: created.version,
      }),
    ).rejects.toMatchObject({status: 409, code: 'VERSION_CONFLICT'});

    const stored = await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
      publicId: created.publicId,
    });
    expect(stored).toMatchObject({active: false, version: created.version + 1});
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(0);
  });

  it('applies one occurrence, advances the grid and replays it without a second movement', async () => {
    const user = await seedUser('execute-replay@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        estimatedAmount: 10000,
        totalOccurrences: 1,
        endDate: null,
      }),
    );

    const first = await service.execute(user.publicId, created.publicId, {actualAmount: 75000});

    expect(first.occurrence).toMatchObject({
      contemplatedDate: '2026-11-23',
      occurrenceDate: '2026-11-23',
      status: ScheduledExecutionStatusEnum.APPLIED.toString(),
      reason: null,
    });
    expect(first.movement).toMatchObject({
      amount: 75000,
      date: '2026-11-23T00:00:00.000Z',
      scheduledTransactionPublicId: created.publicId,
    });
    expect(first.balances).toEqual([
      {accountPublicId: account.publicId, currentBalance: 25000, version: 1},
    ]);
    expect(first.schedule).toMatchObject({
      completedOccurrences: 1,
      nextContemplatedDate: '2026-12-23',
      nextExecutionDate: '2026-12-23',
      active: false,
      version: created.version + 1,
    });

    const firstMovementPublicId = first.movement?.publicId;
    if (!firstMovementPublicId) {
      throw new Error('Expected an applied movement');
    }

    const movements = dataSource.getRepository(MovementEntity);
    expect(await movements.count()).toBe(1);
    const storedMovement = await movements.findOneByOrFail({publicId: firstMovementPublicId});
    expect(storedMovement.scheduledTransactionId).toBe(
      (await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
        publicId: created.publicId,
      })).id,
    );

    // Simulates a stale second request that still targets the processed grid point;
    // normal replays are short-circuited by the Idempotency-Key interceptor.
    await dataSource.getRepository(ScheduledTransactionEntity).update(
      {publicId: created.publicId},
      {active: true, nextContemplatedDate: '2026-11-23', nextExecutionDate: '2026-11-23'},
    );
    const replay = await service.execute(user.publicId, created.publicId, {});

    expect(replay.movement?.publicId).toBe(firstMovementPublicId);
    expect(replay.schedule.version).toBe(first.schedule.version);
    expect(await movements.count()).toBe(1);
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
  });

  it('serializes concurrent executions so only one movement is created', async () => {
    const user = await seedUser('execute-concurrent@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const outcomes = await Promise.allSettled([
      service.execute(user.publicId, created.publicId, {actualAmount: 10000}),
      service.execute(user.publicId, created.publicId, {actualAmount: 20000}),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: {code: ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString()},
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
  });

  it('skips a due occurrence inside a closed period without writing a movement', async () => {
    const user = await seedUser('execute-closed@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );
    await seedClosedPeriod(user, '2026-11');

    const result = await service.execute(user.publicId, created.publicId, {});

    expect(result.occurrence).toMatchObject({
      contemplatedDate: '2026-11-23',
      occurrenceDate: '2026-11-23',
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      reason: ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
    });
    expect(result.movement).toBeNull();
    expect(result.balances).toEqual([]);
    expect(result.schedule).toMatchObject({
      completedOccurrences: 1,
      nextContemplatedDate: '2026-12-23',
      version: created.version + 1,
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('records a failed balance check without advancing the grid', async () => {
    const user = await seedUser('execute-failed@example.com');
    const account = await seedAccount(user, {currentBalance: 0});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    await expect(service.execute(user.publicId, created.publicId, {})).rejects.toMatchObject({
      status: 409,
      code: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    });

    const execution = await dataSource.getRepository(ScheduledExecutionEntity).findOneByOrFail({
      scheduledTransactionId: (await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
        publicId: created.publicId,
      })).id,
    });
    expect(execution).toMatchObject({
      status: ScheduledExecutionStatusEnum.FAILED.toString(),
      reason: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
      attempts: 1,
      movementId: null,
    });
    const storedSchedule = await dataSource
      .getRepository(ScheduledTransactionEntity)
      .findOneByOrFail({publicId: created.publicId});
    expect(storedSchedule).toMatchObject({
      completedOccurrences: 0,
      nextContemplatedDate: '2026-11-23',
      nextExecutionDate: '2026-11-23',
      version: created.version,
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('cancels a due occurrence without moving balances and rejects the re-anchored slot', async () => {
    const user = await seedUser('cancel-due@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        estimatedAmount: 10000,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const result = await service.cancel(user.publicId, created.publicId, {
      note: 'Cancelada por el usuario',
    });

    expect(result.occurrence).toMatchObject({
      contemplatedDate: '2026-11-23',
      occurrenceDate: '2026-11-23',
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      reason: ScheduledExecutionReasonEnum.USER_CANCELLED.toString(),
    });
    expect(result.movement).toMatchObject({
      amount: 10000,
      date: '2026-11-23T00:00:00.000Z',
      note: 'Cancelada por el usuario',
      isCanceled: true,
      scheduledTransactionPublicId: created.publicId,
    });
    expect(result.schedule).toMatchObject({
      completedOccurrences: 1,
      nextContemplatedDate: '2026-12-23',
      nextExecutionDate: '2026-12-23',
      active: true,
      version: created.version + 1,
    });

    const executions = dataSource.getRepository(ScheduledExecutionEntity);
    const execution = await executions.findOneByOrFail({
      scheduledTransactionId: (await dataSource
        .getRepository(ScheduledTransactionEntity)
        .findOneByOrFail({publicId: created.publicId})).id,
    });
    expect(execution.movementId).not.toBeNull();
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
    expect(
      await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id}),
    ).toMatchObject({currentBalance: 100000, version: 0});

    // Re-anchoring back to the processed slot must not create a second canceled row.
    await dataSource.getRepository(ScheduledTransactionEntity).update(
      {publicId: created.publicId},
      {nextContemplatedDate: '2026-11-23', nextExecutionDate: '2026-11-23'},
    );
    await expect(
      service.cancel(user.publicId, created.publicId, {}),
    ).rejects.toMatchObject({
      status: 409,
      code: ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED.toString(),
    });
    expect(await executions.count()).toBe(1);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
  });

  it('rejects a cancellation inside a closed period before writing anything', async () => {
    const user = await seedUser('cancel-closed@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );
    await seedClosedPeriod(user, '2026-11');

    await expect(service.cancel(user.publicId, created.publicId, {})).rejects.toMatchObject({
      status: 409,
      code: ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
    });

    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(0);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
    expect(
      await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
        publicId: created.publicId,
      }),
    ).toMatchObject({
      completedOccurrences: 0,
      nextContemplatedDate: '2026-11-23',
      nextExecutionDate: '2026-11-23',
      version: created.version,
    });
  });

  it('serializes concurrent cancellations so only one canceled row is created', async () => {
    const user = await seedUser('cancel-concurrent@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const outcomes = await Promise.allSettled([
      service.cancel(user.publicId, created.publicId, {}),
      service.cancel(user.publicId, created.publicId, {}),
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.find((outcome) => outcome.status === 'rejected')).toMatchObject({
      reason: {code: ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString()},
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
  });

  it('previews due occurrences read-only with a bounded pending count', async () => {
    const user = await seedUser('due-preview@example.com');
    const account = await seedAccount(user, {currentBalance: 1_000_000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-20',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 1000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const preview = await service.findDue(user.publicId, {}, null);

    expect(preview.items.map((item) => item.publicId)).toEqual([created.publicId]);
    expect(preview.pendingOccurrences).toBe(4);
    expect(preview.skippedWhileInactive).toBe(0);
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(0);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
    expect(
      await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({publicId: created.publicId}),
    ).toMatchObject({nextExecutionDate: '2026-11-20', completedOccurrences: 0, version: 0});
  });

  it('catches up every due occurrence oldest first and returns an empty replay', async () => {
    const user = await seedUser('apply-due@example.com');
    const account = await seedAccount(user, {currentBalance: 1_000_000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-20',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 1000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const summary = await service.applyDue(user.publicId, {asOf: '2026-11-23'}, null);

    expect(summary).toMatchObject({asOf: '2026-11-23', applied: 4, skipped: 0, failed: 0});
    expect(summary.results.map((result) => result.contemplatedDate)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
    expect(summary.results.every((result) => result.movementPublicId !== null)).toBe(true);
    expect(summary.schedules[0]).toMatchObject({
      completedOccurrences: 4,
      nextContemplatedDate: '2026-11-24',
      nextExecutionDate: '2026-11-24',
      version: created.version + 4,
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(4);

    const replay = await service.applyDue(user.publicId, {asOf: '2026-11-23'}, null);

    expect(replay.results).toEqual([]);
    expect(replay.schedules).toEqual([]);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(4);
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(4);
  });

  it('caps catch-up at the configured number of occurrences per schedule', async () => {
    const user = await seedUser('apply-due-cap@example.com');
    const account = await seedAccount(user, {currentBalance: 1_000_000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-20',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 1000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );
    const capped = buildService({catchupBatchSize: 2});

    const first = await capped.applyDue(user.publicId, {asOf: '2026-11-23'}, null);
    expect(first.applied).toBe(2);
    expect(first.schedules[0].nextExecutionDate).toBe('2026-11-22');

    const second = await capped.applyDue(user.publicId, {asOf: '2026-11-23'}, null);
    expect(second.applied).toBe(2);
    expect(second.schedules[0].nextExecutionDate).toBe('2026-11-24');
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(4);
  });

  it('skips closed-period occurrences before applying the open ones', async () => {
    const user = await seedUser('apply-due-closed@example.com');
    const account = await seedAccount(user, {currentBalance: 1_000_000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    await service.create(
      user.publicId,
      request({
        anchorDate: '2026-10-01',
        estimatedAmount: 1000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );
    await seedClosedPeriod(user, '2026-10');

    const summary = await service.applyDue(user.publicId, {asOf: '2026-11-23'}, null);

    expect(summary.results).toHaveLength(2);
    expect(summary.results[0]).toMatchObject({
      contemplatedDate: '2026-10-01',
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      reason: ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
      movementPublicId: null,
    });
    expect(summary.results[1]).toMatchObject({
      contemplatedDate: '2026-11-01',
      status: ScheduledExecutionStatusEnum.APPLIED.toString(),
      reason: null,
    });
    expect(summary).toMatchObject({applied: 1, skipped: 1, failed: 0, skippedWhileInactive: 0});
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
  });

  it('applies the D58 grace window for a returning inactive user', async () => {
    const user = await seedUser('apply-due-inactive@example.com');
    await dataSource
      .getRepository(UserEntity)
      .update({id: user.id}, {lastActiveAt: '2020-01-01T00:00:00.000Z'});
    const account = await seedAccount(user, {currentBalance: 1_000_000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-01',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 1000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const summary = await service.applyDue(
      user.publicId,
      {asOf: '2026-11-23'},
      '2020-01-01T00:00:00.000Z',
    );

    expect(summary).toMatchObject({applied: 8, skipped: 15, skippedWhileInactive: 15});
    expect(
      summary.results.filter(
        (result) => result.reason === ScheduledExecutionReasonEnum.INACTIVE_USER.toString(),
      ),
    ).toHaveLength(15);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(8);
  });

  it('soft deletes a schedule while keeping its executions and movements', async () => {
    const user = await seedUser('delete@example.com');
    const foreign = await seedUser('delete-foreign@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-20',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 10000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );
    const applied = await service.execute(user.publicId, created.publicId, {});
    const movement = applied.movement;
    if (!movement) {
      throw new Error('Expected an applied movement');
    }

    const period = FIXED_NOW.slice(0, 7);
    expect(
      (await service.findDue(user.publicId, {}, null)).items.map((item) => item.publicId),
    ).toContain(created.publicId);
    const beforeDelete = await service.list(user.publicId, listRequest({period}));
    expect(beforeDelete.items.map((item) => item.publicId)).toContain(created.publicId);

    await expect(service.remove(user.publicId, created.publicId)).resolves.toBeUndefined();

    const stored = await dataSource.getRepository(ScheduledTransactionEntity).findOneByOrFail({
      publicId: created.publicId,
    });
    expect(stored).toMatchObject({deletedAt: FIXED_NOW, version: applied.schedule.version + 1});
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
    expect(
      await dataSource.getRepository(MovementEntity).findOneByOrFail({publicId: movement.publicId}),
    ).toMatchObject({scheduledTransactionId: stored.id});

    await expect(service.findOne(user.publicId, created.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await expect(service.remove(user.publicId, created.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await expect(service.remove(foreign.publicId, created.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect((await service.findDue(user.publicId, {}, null)).items).toEqual([]);
    expect((await service.list(user.publicId, listRequest({period}))).items).toEqual([]);
  });

  it('deactivates at endDate after an occurrence and writes no further rows', async () => {
    const user = await seedUser('stop-end-date@example.com');
    const account = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const created = await service.create(
      user.publicId,
      request({
        anchorDate: '2026-11-23',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 10000,
        endDate: '2026-11-23',
        totalOccurrences: null,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
      }),
    );

    const applied = await service.execute(user.publicId, created.publicId, {});

    expect(applied.schedule).toMatchObject({
      active: false,
      completedOccurrences: 1,
      nextContemplatedDate: '2026-11-24',
      nextExecutionDate: '2026-11-24',
    });
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);

    await expect(service.execute(user.publicId, created.publicId, {})).rejects.toMatchObject({
      status: 409,
      code: 'SCHEDULE_INACTIVE',
    });
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
  });

  it('never applies another user\'s due occurrences', async () => {
    const owner = await seedUser('apply-due-owner@example.com');
    const outsider = await seedUser('apply-due-outsider@example.com');
    const account = await seedAccount(owner, {currentBalance: 1_000_000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    await service.create(
      owner.publicId,
      request({
        anchorDate: '2026-11-20',
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        estimatedAmount: 1000,
        categoryPublicId: category.publicId,
        sourceAccountPublicId: account.publicId,
        totalOccurrences: null,
        endDate: null,
      }),
    );

    const summary = await service.applyDue(outsider.publicId, {asOf: '2026-11-23'}, null);

    expect(summary.results).toEqual([]);
    expect(summary.schedules).toEqual([]);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
    expect(await dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(0);
  });
});

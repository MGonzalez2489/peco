import type {
  CategoryApplyType,
  CreateScheduledTransactionRequest,
  ListScheduledTransactionsQuery,
} from '@peco/contracts';
import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../database/entities';
import {UtcClock} from '../database/clock/utc-clock';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';

jest.setTimeout(180_000);

const FIXED_NOW = '2026-11-23T12:00:00.000Z';

describe('scheduled transactions (MySQL 8, US-601–US-603)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: ScheduledTransactionsService;

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

    const queries = new ScheduledTransactionQueryRepository(dataSource);
    const clock = new UtcClock();
    jest.spyOn(clock, 'now').mockReturnValue(FIXED_NOW);
    service = new ScheduledTransactionsService(
      new UserProfileRepository(dataSource),
      new ScheduledTransactionCreationRepository(dataSource),
      queries,
      new ScheduledTransactionUpdateRepository(dataSource, queries, clock),
      clock,
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM scheduledExecutions');
    await dataSource.query('DELETE FROM scheduledTransactions');
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
});

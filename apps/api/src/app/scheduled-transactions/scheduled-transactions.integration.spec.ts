import type {
  CategoryApplyType,
  CreateScheduledTransactionRequest,
} from '@peco/contracts';
import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../database/entities';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';

jest.setTimeout(180_000);

describe('schedule creation (MySQL 8, US-601)', () => {
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

    service = new ScheduledTransactionsService(
      new UserProfileRepository(dataSource),
      new ScheduledTransactionCreationRepository(dataSource),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
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
});

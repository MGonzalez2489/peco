import type {AccountType, MovementType} from '@peco/contracts';
import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, type DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../config/app-config';
import {ConfigService} from '../config/config.service';
import {ApiException} from '../common/http/api-exception';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  UserEntity,
} from '../database/entities';
import {PeriodClosingRepository} from '../periods/services/period-closing.repository';
import {PeriodClosingService} from '../periods/services/period-closing.service';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {CategoryDistributionRepository} from './services/category-distribution.repository';
import {CategoryDistributionService} from './services/category-distribution.service';

jest.setTimeout(180_000);

const REGISTRATION = '2026-08-01T00:00:00.000Z';
const NOW = '2026-11-05T10:00:00.000Z';
const CLOSED_PERIOD = '2026-09';

interface CategorySeed {
  readonly name: string;
  readonly displayName: string;
  readonly color: string;
  readonly icon: string;
  readonly isRoot?: boolean;
  readonly owner?: UserEntity | null;
}

describe('category distribution (MySQL 8, US-804)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let clock: UtcClock;
  let service: CategoryDistributionService;

  const seedUser = async (email: string): Promise<UserEntity> => {
    const users = dataSource.getRepository(UserEntity);
    const user = await users.save(
      users.create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: NOW,
        deletedAt: null,
      }),
    );
    await users.update({id: user.id}, {createdAt: REGISTRATION});
    return users.findOneByOrFail({id: user.id});
  };

  const seedAccount = async (
    user: UserEntity,
    name: string,
    type: AccountType,
  ): Promise<AccountEntity> => {
    const accounts = dataSource.getRepository(AccountEntity);
    const account = await accounts.save(
      accounts.create({
        userId: user.id,
        name,
        type,
        initialBalance: 100_000,
        currentBalance: 100_000,
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

  const seedCategory = async (seed: CategorySeed): Promise<CategoryEntity> => {
    const categories = dataSource.getRepository(CategoryEntity);
    return categories.save(
      categories.create({
        userId: seed.owner?.id ?? null,
        name: `${seed.name}-${Math.random().toString(36).slice(2, 10)}`,
        displayName: seed.displayName,
        color: seed.color,
        icon: seed.icon,
        applyType: CategoryApplyTypeEnum.BOTH.toString(),
        isRoot: seed.isRoot ?? false,
        isSystem: false,
        deletedAt: null,
      }),
    );
  };

  const seedMovement = async (
    user: UserEntity,
    account: AccountEntity,
    category: CategoryEntity,
    type: MovementType,
    amount: number,
    date: string,
    overrides: Partial<MovementEntity> = {},
  ): Promise<MovementEntity> =>
    dataSource.getRepository(MovementEntity).save(
      dataSource.getRepository(MovementEntity).create({
        userId: user.id,
        accountId: account.id,
        targetAccountId: null,
        categoryId: category.id,
        type,
        amount,
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
        ...overrides,
      }),
    );

  const close = async (user: UserEntity): Promise<void> => {
    const closing = new PeriodClosingService(
      new PeriodClosingRepository(dataSource),
      new UserProfileRepository(dataSource),
      clock,
      new ConfigService({operational: {maxBackfillMonths: 120}} as AppConfig),
    );
    await closing.close(user.publicId, CLOSED_PERIOD);
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

    clock = {now: () => NOW} as UtcClock;
    service = new CategoryDistributionService(
      new UserProfileRepository(dataSource),
      new CategoryDistributionRepository(dataSource),
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
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('matches the closed-month ledger totals with deterministic rounded shares', async () => {
    const user = await seedUser('closed@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString());
    const root = await seedCategory({
      name: 'unknown',
      displayName: 'Otros',
      color: '#6B7280',
      icon: 'folder-open',
      isRoot: true,
    });
    const food = await seedCategory({
      name: 'food',
      displayName: 'Comida',
      color: '#F97316',
      icon: 'utensils',
    });
    const services = await seedCategory({
      name: 'services',
      displayName: 'Servicios',
      color: '#F59E0B',
      icon: 'zap',
    });

    await seedMovement(user, cash, food, MovementTypeEnum.EXPENSE.toString(), 90_000, '2026-09-05T10:00:00.000Z');
    await seedMovement(user, cash, services, MovementTypeEnum.EXPENSE.toString(), 55_000, '2026-09-12T10:00:00.000Z');
    await seedMovement(user, cash, food, MovementTypeEnum.INCOME.toString(), 200_000, '2026-09-14T10:00:00.000Z');
    await seedMovement(user, cash, root, MovementTypeEnum.EXPENSE.toString(), 999_999, '2026-09-15T10:00:00.000Z', {
      isCanceled: true,
    });
    await close(user);

    const result = await service.find(user.publicId, CLOSED_PERIOD, MovementTypeEnum.EXPENSE.toString());

    expect(result).toEqual({
      period: CLOSED_PERIOD,
      type: MovementTypeEnum.EXPENSE.toString(),
      total: 145_000,
      items: [
        {
          categoryPublicId: food.publicId,
          displayName: 'Comida',
          color: '#F97316',
          icon: 'utensils',
          amount: 90_000,
          percentage: 62,
        },
        {
          categoryPublicId: services.publicId,
          displayName: 'Servicios',
          color: '#F59E0B',
          icon: 'zap',
          amount: 55_000,
          percentage: 38,
        },
      ],
    });
  });

  it('keeps reversal pairs, excludes transfers/cancellations and isolates owners', async () => {
    const user = await seedUser('current@example.com');
    const other = await seedUser('other@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString());
    const bank = await seedAccount(user, 'Banco', AccountTypeEnum.DEBIT.toString());
    const otherCash = await seedAccount(other, 'Ajeno', AccountTypeEnum.CASH.toString());
    const root = await seedCategory({
      name: 'unknown',
      displayName: 'Otros',
      color: '#6B7280',
      icon: 'folder-open',
      isRoot: true,
    });
    const own = await seedCategory({
      name: 'cafe',
      displayName: 'Café',
      color: '#F97316',
      icon: 'coffee',
      owner: user,
    });
    const reassigned = await seedCategory({
      name: 'old',
      displayName: ' Antigua',
      color: '#8B5CF6',
      icon: 'gift',
      owner: user,
    });
    const foreign = await seedCategory({
      name: 'foreign',
      displayName: 'Ajena',
      color: '#EF4444',
      icon: 'banknote',
      owner: other,
    });

    await seedMovement(user, cash, own, MovementTypeEnum.EXPENSE.toString(), 10_000, '2026-11-02T10:00:00.000Z');
    await seedMovement(user, cash, reassigned, MovementTypeEnum.EXPENSE.toString(), 5_000, '2026-11-03T10:00:00.000Z');
    await seedMovement(user, cash, own, MovementTypeEnum.EXPENSE.toString(), 999_999, '2026-11-04T10:00:00.000Z', {
      isCanceled: true,
    });
    await seedMovement(user, cash, own, MovementTypeEnum.TRANSFER.toString(), 30_000, '2026-11-05T10:00:00.000Z', {
      targetAccountId: bank.id,
    });
    await seedMovement(user, cash, own, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-06T10:00:00.000Z', {
      isReversed: true,
    });
    await seedMovement(user, cash, own, MovementTypeEnum.INCOME.toString(), 20_000, '2026-11-07T10:00:00.000Z', {
      isReversal: true,
    });
    await seedMovement(other, otherCash, foreign, MovementTypeEnum.EXPENSE.toString(), 777_777, '2026-11-08T10:00:00.000Z');
    await dataSource
      .getRepository(CategoryEntity)
      .update({id: reassigned.id}, {deletedAt: NOW});

    const expenses = await service.find(user.publicId, '2026-11', MovementTypeEnum.EXPENSE.toString());

    expect(expenses.total).toBe(35_000);
    expect(expenses.items).toEqual([
      {
        categoryPublicId: own.publicId,
        displayName: 'Café',
        color: '#F97316',
        icon: 'coffee',
        amount: 30_000,
        percentage: 86,
      },
      {
        categoryPublicId: root.publicId,
        displayName: 'Otros',
        color: '#6B7280',
        icon: 'folder-open',
        amount: 5_000,
        percentage: 14,
      },
    ]);

    const income = await service.find(user.publicId, '2026-11', MovementTypeEnum.INCOME.toString());
    expect(income.total).toBe(20_000);
    expect(income.items).toMatchObject([
      {categoryPublicId: own.publicId, amount: 20_000, percentage: 100},
    ]);
  });

  it('answers 404 for an unknown or inactive user', async () => {
    await seedUser('owner@example.com');

    const error = await service
      .find('missing-public-id', '2026-11', MovementTypeEnum.EXPENSE.toString())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
  });
});

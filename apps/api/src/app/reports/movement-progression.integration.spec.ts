import type {AccountType, MovementType} from '@peco/contracts';
import {AccountTypeEnum, CategoryApplyTypeEnum, MovementTypeEnum} from '@peco/enums';
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
import {MovementProgressionRepository} from './services/movement-progression.repository';
import {MovementProgressionService} from './services/movement-progression.service';

jest.setTimeout(180_000);

const REGISTRATION = '2026-08-01T00:00:00.000Z';
const NOW = '2026-11-05T10:00:00.000Z';
const CLOSED_PERIOD = '2026-09';

describe('movement progression (MySQL 8, US-803)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let clock: UtcClock;
  let service: MovementProgressionService;

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

  const close = async (user: UserEntity, period = CLOSED_PERIOD): Promise<void> => {
    const closing = new PeriodClosingService(
      new PeriodClosingRepository(dataSource),
      new UserProfileRepository(dataSource),
      clock,
      new ConfigService({
        operational: {maxBackfillMonths: 120},
      } as AppConfig),
    );
    await closing.close(user.publicId, period);
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
    service = new MovementProgressionService(
      new UserProfileRepository(dataSource),
      new MovementProgressionRepository(dataSource),
      clock,
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

  it('uses frozen totals for a closed month and ignores transfers and cancellations', async () => {
    const user = await seedUser('closed@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString());
    const bank = await seedAccount(user, 'Banco', AccountTypeEnum.DEBIT.toString());
    const category = await seedCategory();
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 10_000, '2026-08-20T10:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 50_000, '2026-09-05T10:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-09-12T10:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 9_999, '2026-09-15T10:00:00.000Z', {
      isCanceled: true,
    });
    await seedMovement(user, cash, category, MovementTypeEnum.TRANSFER.toString(), 30_000, '2026-09-18T10:00:00.000Z', {
      targetAccountId: bank.id,
    });
    await close(user);

    const result = await service.find(user.publicId, CLOSED_PERIOD);

    expect(result.period).toBe(CLOSED_PERIOD);
    expect(result.points).toHaveLength(30);
    expect(result.points[0]).toEqual({date: '2026-09-01', net: 0});
    expect(result.points[4]).toEqual({date: '2026-09-05', net: 50_000});
    expect(result.points[11]).toEqual({date: '2026-09-12', net: 30_000});
    expect(result.points[17]).toEqual({date: '2026-09-18', net: 30_000});
    expect(result.points[29].net).toBe(30_000);
    expect(result.totals).toEqual({totalIncome: 50_000, totalExpenses: 20_000, netBalance: 30_000});
  });

  it('applies the reversal filter in the current month', async () => {
    const user = await seedUser('current@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString());
    const category = await seedCategory();
    await seedMovement(user, cash, category, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-02T10:00:00.000Z', {
      isReversed: true,
    });
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 20_000, '2026-11-03T10:00:00.000Z', {
      isReversal: true,
    });
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 10_000, '2026-11-04T10:00:00.000Z');

    const included = await service.find(user.publicId, '2026-11');
    expect(included.points[1]).toEqual({date: '2026-11-02', net: -20_000});
    expect(included.points[2]).toEqual({date: '2026-11-03', net: 0});
    expect(included.points[3]).toEqual({date: '2026-11-04', net: 10_000});
    expect(included.totals).toEqual({totalIncome: 30_000, totalExpenses: 20_000, netBalance: 10_000});

    const excluded = await service.find(user.publicId, '2026-11', true);
    expect(excluded.points[1]).toEqual({date: '2026-11-02', net: 0});
    expect(excluded.points[2]).toEqual({date: '2026-11-03', net: 0});
    expect(excluded.points[3]).toEqual({date: '2026-11-04', net: 10_000});
    expect(excluded.totals).toEqual({totalIncome: 10_000, totalExpenses: 0, netBalance: 10_000});
  });

  it('answers 404 for an unknown or inactive user', async () => {
    await seedUser('owner@example.com');

    const error = await service
      .find('missing-public-id', '2026-11')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
  });
});

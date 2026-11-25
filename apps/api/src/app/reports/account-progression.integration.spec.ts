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
import {AccountRepository} from '../accounts/services/account.repository';
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
import {ApiException} from '../common/http/api-exception';
import {AccountProgressionRepository} from './services/account-progression.repository';
import {AccountProgressionService} from './services/account-progression.service';

jest.setTimeout(180_000);

const REGISTRATION = '2026-08-01T00:00:00.000Z';
const NOW = '2026-11-05T10:00:00.000Z';
const CLOSED_PERIOD = '2026-09';

describe('account progression (MySQL 8, US-802)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let clock: UtcClock;
  let service: AccountProgressionService;

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
    initialBalance: number,
    creditLimit: number | null = null,
  ): Promise<AccountEntity> => {
    const accounts = dataSource.getRepository(AccountEntity);
    const account = await accounts.save(
      accounts.create({
        userId: user.id,
        name,
        type,
        initialBalance,
        currentBalance: initialBalance,
        includeInTotal: true,
        targetGoal: null,
        creditLimit,
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
    isCanceled = false,
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
        isCanceled,
        scheduledTransactionId: null,
        version: 0,
        deletedAt: null,
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
    service = new AccountProgressionService(
      new UserProfileRepository(dataSource),
      new AccountRepository(dataSource, clock),
      new AccountProgressionRepository(dataSource),
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

  it('reads the frozen opening and closes on the snapshot final balance', async () => {
    const user = await seedUser('closed@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString(), 100_000);
    const category = await seedCategory();
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 20_000, '2026-08-20T10:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 50_000, '2026-09-05T10:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-09-12T10:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.EXPENSE.toString(), 9_999, '2026-09-15T10:00:00.000Z', true);
    await close(user);

    await dataSource.getRepository(AccountEntity).update(
      {id: cash.id},
      {name: 'Nombre actual', type: AccountTypeEnum.CREDIT.toString(), color: '#FFFFFF', icon: 'star'},
    );

    const result = await service.find(user.publicId, cash.publicId, CLOSED_PERIOD);

    expect(result).toEqual({
      period: CLOSED_PERIOD,
      account: {
        publicId: cash.publicId,
        name: 'Efectivo',
        type: AccountTypeEnum.CASH.toString(),
        color: '#10B981',
        icon: 'banknote',
      },
      initialBalance: 120_000,
      finalBalance: 150_000,
      creditUsage: null,
      points: [
        {date: '2026-09-01', balance: 120_000},
        {date: '2026-09-05', balance: 170_000},
        {date: '2026-09-12', balance: 150_000},
      ],
    });
  });

  it('reconstructs the current-month opening and reports live credit usage', async () => {
    const user = await seedUser('current@example.com');
    const credit = await seedAccount(
      user,
      'Tarjeta',
      AccountTypeEnum.CREDIT.toString(),
      -100_000,
      500_000,
    );
    const category = await seedCategory();
    await seedMovement(user, credit, category, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-10-20T10:00:00.000Z');
    await seedMovement(user, credit, category, MovementTypeEnum.EXPENSE.toString(), 30_000, '2026-11-08T10:00:00.000Z');
    await seedMovement(user, credit, category, MovementTypeEnum.INCOME.toString(), 20_000, '2026-11-12T10:00:00.000Z');
    await dataSource.getRepository(AccountEntity).update({id: credit.id}, {currentBalance: -130_000});

    const result = await service.find(user.publicId, credit.publicId, '2026-11');

    expect(result.initialBalance).toBe(-120_000);
    expect(result.finalBalance).toBe(-130_000);
    expect(result.creditUsage).toEqual({
      limit: 500_000,
      used: 130_000,
      available: 370_000,
      availablePercentage: 74,
    });
    expect(result.points).toEqual([
      {date: '2026-11-01', balance: -120_000},
      {date: '2026-11-08', balance: -150_000},
      {date: '2026-11-12', balance: -130_000},
    ]);
  });

  it('answers 404 for another user\'s account', async () => {
    const user = await seedUser('owner@example.com');
    const other = await seedUser('foreign@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString(), 100_000);

    const error = await service
      .find(other.publicId, cash.publicId, '2026-11')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
  });
});

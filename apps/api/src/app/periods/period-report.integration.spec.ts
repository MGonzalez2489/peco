import type {AccountType, MovementType} from '@peco/contracts';
import {AccountTypeEnum, CategoryApplyTypeEnum, MovementTypeEnum} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, type DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../config/app-config';
import {ConfigService} from '../config/config.service';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {PeriodClosingRepository} from './services/period-closing.repository';
import {PeriodClosingService} from './services/period-closing.service';
import {PeriodReadRepository} from './services/period-read.repository';
import {PeriodReportService} from './services/period-report.service';

jest.setTimeout(180_000);

const REGISTRATION = '2026-08-01T00:00:00.000Z';
const NOW = '2026-11-05T10:00:00.000Z';
const CLOSED_PERIOD = '2026-09';

describe('period report frozen/ledger split (MySQL 8, US-705)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let clock: UtcClock;
  let reports: PeriodReportService;
  let config: ConfigService;

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

  const seedAccounts = async (
    user: UserEntity,
  ): Promise<{cash: AccountEntity; credit: AccountEntity; excluded: AccountEntity}> => {
    const accounts = dataSource.getRepository(AccountEntity);
    const create = (
      name: string,
      type: AccountType,
      balance: number,
      includeInTotal: boolean,
    ) =>
      accounts.save(
        accounts.create({
          userId: user.id,
          name,
          type,
          initialBalance: balance,
          currentBalance: balance,
          includeInTotal,
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

    const cash = await create('Efectivo', AccountTypeEnum.CASH.toString(), 100_000, true);
    const credit = await create('Tarjeta', AccountTypeEnum.CREDIT.toString(), -30_000, true);
    const excluded = await create('Ahorro excluido', AccountTypeEnum.SAVINGS.toString(), 20_000, false);
    for (const account of [cash, credit, excluded]) {
      await accounts.update({id: account.id}, {createdAt: REGISTRATION});
    }
    return {cash, credit, excluded};
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
      }),
    );

  const close = async (user: UserEntity): Promise<void> => {
    const closing = new PeriodClosingService(
      new PeriodClosingRepository(dataSource),
      new UserProfileRepository(dataSource),
      clock,
      config,
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
    config = new ConfigService({
      operational: {maxBackfillMonths: 120},
    } as AppConfig);
    reports = new PeriodReportService(
      new PeriodReadRepository(dataSource),
      new PeriodClosingRepository(dataSource),
      new UserProfileRepository(dataSource),
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

  it('returns identical snapshot and ledger numbers for the same closed month', async () => {
    const user = await seedUser('frozen@example.com');
    const {cash, credit} = await seedAccounts(user);
    const category = await seedCategory();
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 50_000, '2026-09-05T12:00:00.000Z');
    await seedMovement(user, cash, category, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-09-12T12:00:00.000Z');
    await seedMovement(user, credit, category, MovementTypeEnum.EXPENSE.toString(), 5_000, '2026-09-18T12:00:00.000Z');
    await close(user);

    const frozen = await reports.find(user.publicId, CLOSED_PERIOD);

    expect(frozen).toEqual({
      period: CLOSED_PERIOD,
      frozen: true,
      totals: {totalIncome: 50_000, totalExpenses: 25_000, netBalance: 25_000, transactionCount: 3},
      balances: {totalBalance: 115_000, availableBalance: 130_000, liabilitiesBalance: 35_000},
    });

    await dataSource.getRepository(PeriodSnapshotEntity).delete({
      userId: user.id,
      period: CLOSED_PERIOD,
    });

    const ledger = await reports.find(user.publicId, CLOSED_PERIOD);

    expect(ledger.frozen).toBe(false);
    expect(ledger.totals).toEqual(frozen.totals);
    expect(ledger.balances).toEqual(frozen.balances);
    expect(
      await dataSource.getRepository(MovementEntity).countBy({userId: user.id}),
    ).toBe(3);
  });

  it('derives the frozen balances from accountType/includeInTotal, not live metadata', async () => {
    const user = await seedUser('metadata@example.com');
    const {cash, credit, excluded} = await seedAccounts(user);
    const category = await seedCategory();
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 50_000, '2026-09-05T12:00:00.000Z');
    await close(user);

    const accounts = dataSource.getRepository(AccountEntity);
    await accounts.update({id: credit.id}, {type: AccountTypeEnum.CASH.toString(), includeInTotal: false});
    await accounts.update({id: excluded.id}, {includeInTotal: true});

    const frozen = await reports.find(user.publicId, CLOSED_PERIOD);

    // A live-ledger read would now report 170_000 available and 0 liabilities.
    expect(frozen.balances).toEqual({
      totalBalance: 140_000,
      availableBalance: 150_000,
      liabilitiesBalance: 30_000,
    });
  });

  it('projects current, future and unsnapshotted past months from the ledger', async () => {
    const user = await seedUser('ledger@example.com');
    const other = await seedUser('other@example.com');
    const {cash} = await seedAccounts(user);
    const category = await seedCategory();
    await seedMovement(user, cash, category, MovementTypeEnum.INCOME.toString(), 10_000, '2026-11-05T12:00:00.000Z');
    await close(user);

    const current = await reports.find(user.publicId, '2026-11');
    const future = await reports.find(user.publicId, '2026-12');
    const unsnapshotted = await reports.find(user.publicId, '2026-07');
    const foreign = await reports.find(other.publicId, CLOSED_PERIOD);

    expect(current).toMatchObject({
      frozen: false,
      totals: {totalIncome: 10_000, totalExpenses: 0, transactionCount: 1},
    });
    expect(future.frozen).toBe(false);
    expect(unsnapshotted).toMatchObject({
      frozen: false,
      totals: {totalIncome: 0, totalExpenses: 0, transactionCount: 0},
    });
    expect(foreign).toMatchObject({
      period: CLOSED_PERIOD,
      frozen: false,
      totals: {transactionCount: 0},
    });
  });
});

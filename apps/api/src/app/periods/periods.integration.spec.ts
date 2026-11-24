import {Logger} from '@nestjs/common';
import {
  AccountTypeEnum,
  ApiErrorCodeEnum,
  MovementTypeEnum,
  MovementWriteStatusEnum,
} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, In, IsNull, type DataSourceOptions} from 'typeorm';
import {CategoryRepository} from '../categories/services/category.repository';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {ConfigService} from '../config/config.service';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../database/entities';
import {MovementCreationRepository} from '../movements/services/movement-creation.repository';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {PERIOD_BACKFILL_TRUNCATED_CODE} from './constants/period-backfill-truncated-code.constant';
import {SNAPSHOT_GAP_REPAIRED_CODE} from './constants/snapshot-gap-repaired-code.constant';
import {PeriodClosingRepository} from './services/period-closing.repository';
import {PeriodClosingService} from './services/period-closing.service';

jest.setTimeout(180_000);

const NOW = '2026-11-24T09:00:00.000Z';
const REGISTRATION = '2026-09-01T00:00:00.000Z';

const createGate = (): {opened: Promise<void>; open: () => void} => {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {opened, open: () => release()};
};

const config = (maxBackfillMonths = 120): ConfigService =>
  ({config: {operational: {maxBackfillMonths}}}) as unknown as ConfigService;

describe('period closing and snapshots (MySQL 8, US-701)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: PeriodClosingService;
  let repository: PeriodClosingRepository;
  let creations: MovementCreationRepository;
  let categoryId: number;

  const seedUser = async (email: string, createdAt = REGISTRATION): Promise<UserEntity> => {
    const repository = dataSource.getRepository(UserEntity);
    const user = await repository.save(
      repository.create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: NOW,
        deletedAt: null,
      }),
    );
    // The subscriber stamps real wall-clock creation time; backdate it through
    // a raw update so period boundaries can be tested deterministically.
    await repository.update({id: user.id}, {createdAt});
    return repository.findOneByOrFail({id: user.id});
  };

  const seedAccount = async (
    user: UserEntity,
    overrides: Partial<AccountEntity> = {},
  ): Promise<AccountEntity> => {
    const repository = dataSource.getRepository(AccountEntity);
    const account = await repository.save(
      repository.create({
        userId: user.id,
        name: 'Efectivo',
        type: AccountTypeEnum.CASH.toString(),
        initialBalance: 0,
        currentBalance: 0,
        includeInTotal: true,
        targetGoal: null,
        creditLimit: null,
        color: null,
        icon: null,
        pinToHome: false,
        isRoot: false,
        note: null,
        version: 0,
        deletedAt: null,
        ...overrides,
      }),
    );
    await repository.update({id: account.id}, {createdAt: REGISTRATION});
    return repository.findOneByOrFail({id: account.id});
  };

  const seedMovement = async (
    user: UserEntity,
    account: AccountEntity,
    overrides: Partial<MovementEntity> = {},
  ): Promise<MovementEntity> =>
    dataSource.getRepository(MovementEntity).save(
      dataSource.getRepository(MovementEntity).create({
        userId: user.id,
        accountId: account.id,
        targetAccountId: null,
        categoryId,
        type: MovementTypeEnum.INCOME.toString(),
        amount: 1_000,
        date: '2026-09-10T12:00:00.000Z',
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

  beforeAll(async () => {
    container = await new MySqlContainer('mysql:8.4')
      .withDatabase('peco')
      .withUsername('peco')
      .withUserPassword('peco')
      .withRootPassword('root')
      .start();

    const database = {
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      name: container.getDatabase(),
      poolSize: 12,
      healthPingTimeoutMs: 1_000,
    };
    dataSource = new DataSource(createTypeOrmOptions(database) as DataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();

    const clock = {now: () => NOW} as UtcClock;
    repository = new PeriodClosingRepository(dataSource);
    service = new PeriodClosingService(
      repository,
      new UserProfileRepository(dataSource),
      clock,
      config(),
    );
    creations = new MovementCreationRepository(dataSource, clock);
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
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
    await new CategoryRepository(dataSource).ensureSystemCatalog();
    const category = await dataSource.getRepository(CategoryEntity).findOneOrFail({
      where: {name: 'unknown', userId: IsNull()},
    });
    categoryId = category.id;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes one snapshot and one frozen row per account with the exact invariants', async () => {
    const user = await seedUser('owner@example.com');
    const cash = await seedAccount(user, {
      name: 'Efectivo',
      initialBalance: 100_000,
      currentBalance: 450_000,
      color: '#10B981',
      icon: 'banknote',
    });
    const card = await seedAccount(user, {
      name: 'Tarjeta',
      type: AccountTypeEnum.CREDIT.toString(),
      initialBalance: 0,
      currentBalance: -80_000,
    });
    const savings = await seedAccount(user, {
      name: 'Ahorro',
      type: AccountTypeEnum.SAVINGS.toString(),
      initialBalance: 200_000,
      currentBalance: 250_000,
      includeInTotal: false,
    });

    await seedMovement(user, cash, {amount: 300_000, date: '2026-09-01T10:00:00.000Z'});
    await seedMovement(user, card, {
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 80_000,
      date: '2026-09-20T10:00:00.000Z',
    });
    await seedMovement(user, cash, {
      type: MovementTypeEnum.TRANSFER.toString(),
      amount: 50_000,
      targetAccountId: savings.id,
      date: '2026-09-25T10:00:00.000Z',
    });
    await seedMovement(user, cash, {amount: 99_000, isCanceled: true});
    await seedMovement(user, cash, {
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 30_000,
      date: '2026-10-02T10:00:00.000Z',
    });

    const outcome = await service.close(user.publicId, '2026-09');

    expect(outcome.created).toBe(true);
    expect(outcome.snapshot.totalTransactionsCount).toBe(3);
    expect(outcome.snapshot.totalInflows).toBe(300_000);
    expect(outcome.snapshot.totalOutflows).toBe(80_000);
    expect(outcome.snapshot.totalTransfers).toBe(0);
    expect(outcome.snapshot.startDate).toBe('2026-09-01');
    expect(outcome.snapshot.endDate).toBe('2026-09-30');
    expect(outcome.snapshot.accountBalances).toHaveLength(3);
    expect(outcome.snapshot.accountBalances[0]).toMatchObject({
      accountPublicId: cash.publicId,
      initialBalance: 100_000,
      finalBalance: 350_000,
      totalTransactions: 2,
      totalTransfers: -50_000,
    });
    expect(outcome.snapshot.accountBalances[1]).toMatchObject({
      accountPublicId: card.publicId,
      initialBalance: 0,
      finalBalance: -80_000,
      totalTransactions: 1,
    });
    expect(outcome.snapshot.accountBalances[2]).toMatchObject({
      accountPublicId: savings.publicId,
      initialBalance: 200_000,
      finalBalance: 250_000,
      totalTransactions: 1,
      totalTransfers: 50_000,
    });

    const snapshot = await dataSource
      .getRepository(PeriodSnapshotEntity)
      .findOneOrFail({where: {userId: user.id, period: '2026-09'}});
    const rows = await dataSource
      .getRepository(AccountPeriodBalanceEntity)
      .find({where: {snapshotId: snapshot.id}, order: {accountId: 'ASC'}});

    expect(snapshot.globalInitialBalance).toBe(300_000);
    expect(snapshot.globalFinalBalance).toBe(520_000);
    expect(snapshot.globalFinalBalance).toBe(
      rows.reduce((sum, row) => sum + row.finalBalance, 0),
    );
    for (const row of rows) {
      expect(row.initialBalance + row.totalInflows - row.totalOutflows + row.totalTransfers).toBe(
        row.finalBalance,
      );
      expect(row.includeInTotal).toBe(row.accountId !== savings.id);
    }
    expect(rows[0].color).toBe('#10B981');
    expect(rows[0].icon).toBe('banknote');
  });

  it('replays the stored snapshot without recomputing or duplicating rows', async () => {
    const user = await seedUser('replay@example.com');
    const cash = await seedAccount(user, {initialBalance: 10_000, currentBalance: 10_000});
    await seedMovement(user, cash, {amount: 5_000});

    const first = await service.close(user.publicId, '2026-09');
    cash.name = 'Renombrada después del cierre';
    await dataSource.getRepository(AccountEntity).save(cash);

    const replay = await service.close(user.publicId, '2026-09');

    expect(replay.created).toBe(false);
    expect(replay.snapshot).toEqual(first.snapshot);
    expect(replay.snapshot.accountBalances[0].accountName).toBe('Efectivo');
    expect(await dataSource.getRepository(PeriodSnapshotEntity).count()).toBe(1);
    expect(await dataSource.getRepository(AccountPeriodBalanceEntity).count()).toBe(1);
  });

  it('walks missing months oldest first before returning the requested snapshot', async () => {
    const user = await seedUser('walk@example.com');
    await seedAccount(user, {initialBalance: 10_000, currentBalance: 10_000});

    const outcome = await service.close(user.publicId, '2026-10');

    expect(outcome.created).toBe(true);
    expect(outcome.snapshot.period).toBe('2026-10');
    expect(
      await dataSource.getRepository(PeriodSnapshotEntity).find({
        where: {userId: user.id},
        order: {period: 'ASC'},
      }),
    ).toMatchObject([{period: '2026-09'}, {period: '2026-10'}]);
  });

  it('rejects a period before the first activity and the current month', async () => {
    const user = await seedUser('bounds@example.com');

    await expect(service.close(user.publicId, '2026-08')).rejects.toMatchObject({
      code: ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY.toString(),
      userMessage: API_ERROR_MESSAGES.PERIOD_BEFORE_ACTIVITY,
    });
    await expect(service.close(user.publicId, '2026-11')).rejects.toMatchObject({
      code: ApiErrorCodeEnum.PERIOD_NOT_CLOSABLE.toString(),
    });
  });

  it('isolates snapshots by owner', async () => {
    const first = await seedUser('first@example.com');
    const second = await seedUser('second@example.com');
    const firstAccount = await seedAccount(first, {
      name: 'Primero',
      initialBalance: 10_000,
      currentBalance: 10_000,
    });
    await seedAccount(second, {
      name: 'Segundo',
      initialBalance: 90_000,
      currentBalance: 90_000,
    });

    await service.close(first.publicId, '2026-09');
    const secondOutcome = await service.close(second.publicId, '2026-09');

    expect(secondOutcome.snapshot.accountBalances).toHaveLength(1);
    expect(secondOutcome.snapshot.accountBalances[0].accountName).toBe('Segundo');
    expect(secondOutcome.snapshot.accountBalances[0].accountPublicId).not.toBe(firstAccount.publicId);
    const snapshots = await dataSource
      .getRepository(PeriodSnapshotEntity)
      .find({where: {period: '2026-09'}});
    expect(snapshots).toHaveLength(2);
  });

  it('rejects a backdated ledger write once the month is closed', async () => {
    const user = await seedUser('backdated@example.com');
    const cash = await seedAccount(user, {initialBalance: 10_000, currentBalance: 10_000});
    await service.close(user.publicId, '2026-09');

    const status = await creations.create(user.id, {
      type: MovementTypeEnum.INCOME.toString(),
      amount: 1_000,
      date: '2026-09-15T10:00:00.000Z',
      accountPublicId: cash.publicId,
    });

    expect(status.status).toBe(MovementWriteStatusEnum.PERIOD_CLOSED.toString());
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('keeps the snapshot consistent when a ledger write races the close', async () => {
    const user = await seedUser('race@example.com');
    const cash = await seedAccount(user, {initialBalance: 10_000, currentBalance: 10_000});
    const gate = createGate();

    const closing = gate.opened.then(() => service.close(user.publicId, '2026-10'));
    const writing = gate.opened.then(() =>
      creations.create(user.id, {
        type: MovementTypeEnum.INCOME.toString(),
        amount: 25_000,
        date: '2026-10-05T10:00:00.000Z',
        accountPublicId: cash.publicId,
      }),
    );
    gate.open();
    const [outcome, status] = await Promise.all([closing, writing]);

    const snapshot = await dataSource
      .getRepository(PeriodSnapshotEntity)
      .findOneOrFail({where: {userId: user.id, period: '2026-10'}});
    const balance = await dataSource
      .getRepository(AccountPeriodBalanceEntity)
      .findOneOrFail({where: {snapshotId: snapshot.id}});

    expect(outcome.created).toBe(true);
    if (status.status === MovementWriteStatusEnum.CREATED.toString()) {
      expect(balance.finalBalance).toBe(balance.initialBalance + 25_000);
      expect(balance.totalTransactions).toBe(1);
    } else {
      expect(status.status).toBe(MovementWriteStatusEnum.PERIOD_CLOSED.toString());
      expect(balance.finalBalance).toBe(balance.initialBalance);
      expect(balance.totalTransactions).toBe(0);
    }
  });

  it('repairs a middle gap without rewriting its neighbours', async () => {
    const user = await seedUser('gap@example.com');
    await seedAccount(user, {initialBalance: 10_000, currentBalance: 10_000});
    await service.close(user.publicId, '2026-09');

    const snapshots = dataSource.getRepository(PeriodSnapshotEntity);
    const later = await snapshots.save(
      snapshots.create({
        userId: user.id,
        period: '2026-11',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        globalInitialBalance: 10_000,
        globalFinalBalance: 10_000,
        totalInflows: 0,
        totalOutflows: 0,
        totalTransfers: 0,
        totalTransactionsCount: 0,
      }),
    );
    const neighbours = await snapshots.find({
      where: {userId: user.id, period: In(['2026-09', '2026-11'])},
      order: {period: 'ASC'},
    });
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

    const outcome = await service.close(user.publicId, '2026-10');

    expect(outcome.created).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: SNAPSHOT_GAP_REPAIRED_CODE,
        period: '2026-10',
        nextClosedPeriod: '2026-11',
      }),
    );
    const after = await snapshots.find({
      where: {userId: user.id, period: In(['2026-09', '2026-10', '2026-11'])},
      order: {period: 'ASC'},
    });
    expect(after.map(({period}) => period)).toEqual(['2026-09', '2026-10', '2026-11']);
    expect(after[0].createdAt).toBe(neighbours[0].createdAt);
    expect(after[2].createdAt).toBe(later.createdAt);
  });

  it('caps a bounded backfill and resumes on the next run', async () => {
    const user = await seedUser('cap@example.com', '2024-01-01T00:00:00.000Z');
    const account = await seedAccount(user, {initialBalance: 10_000});
    await dataSource
      .getRepository(AccountEntity)
      .update({id: account.id}, {createdAt: '2024-01-01T00:00:00.000Z'});
    const capped = new PeriodClosingService(
      repository,
      new UserProfileRepository(dataSource),
      {now: () => NOW} as UtcClock,
      config(2),
    );
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const snapshots = dataSource.getRepository(PeriodSnapshotEntity);

    const first = await capped.backfill([user.publicId]);
    expect(first).toMatchObject({closed: 2, truncated: 1, errors: 0});
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PERIOD_BACKFILL_TRUNCATED_CODE,
        closedThrough: '2024-02',
        nextPeriod: '2024-03',
      }),
    );
    expect(
      (await snapshots.find({where: {userId: user.id}, order: {period: 'ASC'}})).map(
        ({period}) => period,
      ),
    ).toEqual(['2024-01', '2024-02']);

    const second = await capped.backfill([user.publicId]);
    expect(second).toMatchObject({closed: 2, truncated: 1, errors: 0});
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({
        code: PERIOD_BACKFILL_TRUNCATED_CODE,
        closedThrough: '2024-04',
        nextPeriod: '2024-05',
      }),
    );
    expect(
      (await snapshots.find({where: {userId: user.id}, order: {period: 'ASC'}})).map(
        ({period}) => period,
      ),
    ).toEqual(['2024-01', '2024-02', '2024-03', '2024-04']);
  });

  it('keeps processing the batch when one user fails', async () => {
    const failing = await seedUser('failing@example.com');
    const healthy = await seedUser('healthy@example.com');
    await seedAccount(failing, {initialBalance: 10_000});
    await seedAccount(healthy, {initialBalance: 90_000});
    const original = repository.close.bind(repository);
    jest.spyOn(repository, 'close').mockImplementation(async (userId, period) => {
      if (userId === failing.id) {
        throw new Error('broken user');
      }
      return original(userId, period);
    });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const result = await service.backfill([failing.publicId, healthy.publicId]);

    expect(result).toMatchObject({usersProcessed: 2, closed: 2, errors: 1});
    expect(await dataSource.getRepository(PeriodSnapshotEntity).countBy({userId: failing.id})).toBe(0);
    expect(await dataSource.getRepository(PeriodSnapshotEntity).countBy({userId: healthy.id})).toBe(2);
  });
});

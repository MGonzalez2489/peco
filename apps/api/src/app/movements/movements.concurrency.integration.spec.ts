import type {CreateMovementRequest} from '@peco/contracts';
import {AccountTypeEnum, MovementTypeEnum} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, IsNull, type DataSourceOptions} from 'typeorm';
import {CategoryRepository} from '../categories/services/category.repository';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {AccountEntity, MovementEntity, UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementDeleteRepository} from './services/movement-delete.repository';
import {MovementQueryRepository} from './services/movement-query.repository';
import {MovementReplaceRepository} from './services/movement-replace.repository';
import {MovementRevertRepository} from './services/movement-revert.repository';
import {MovementUpdateRepository} from './services/movement-update.repository';
import {movementBalanceImpact} from './utils/movement-balance-impact.util';

jest.setTimeout(180_000);

const NOW = '2026-11-23T09:00:00.000Z';
const DATE = '2026-11-23T08:00:00.000Z';

/** One-shot latch: every writer reaches it before any of them touches the ledger. */
const createGate = (): {opened: Promise<void>; open: () => void} => {
  let release!: () => void;
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {opened, open: () => release()};
};

/** Waits for a database condition with yields instead of sleeps or fixed delays. */
const waitUntil = async (
  description: string,
  condition: () => Promise<boolean>,
  timeoutMs = 15_000,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error(`Timed out waiting for ${description}`);
};

describe('ledger concurrency and invariants (MySQL 8, US-511)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: MovementsService;
  let creations: MovementCreationRepository;

  const seedUser = async (email: string): Promise<UserEntity> =>
    dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: NOW,
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

  const request = (overrides: Partial<CreateMovementRequest> = {}): CreateMovementRequest => ({
    type: MovementTypeEnum.INCOME.toString(),
    amount: 1_000,
    date: DATE,
    accountPublicId: 'missing',
    ...overrides,
  });

  const expectLedgerInvariant = async (accounts: readonly AccountEntity[]): Promise<void> => {
    const movements = await dataSource.getRepository(MovementEntity).find({
      where: {deletedAt: IsNull()},
    });
    const impacts = new Map<number, number>();

    for (const movement of movements) {
      const movementImpacts = movementBalanceImpact(
        movement.type,
        movement.amount,
        movement.accountId,
        movement.targetAccountId,
        movement.isCanceled,
      );
      for (const [accountId, delta] of movementImpacts) {
        impacts.set(accountId, (impacts.get(accountId) ?? 0) + delta);
      }
    }

    const repository = dataSource.getRepository(AccountEntity);
    for (const seed of accounts) {
      const stored = await repository.findOneByOrFail({id: seed.id});
      expect(stored.currentBalance).toBe(seed.initialBalance + (impacts.get(seed.id) ?? 0));
    }
  };

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

    // The app user cannot read performance_schema by default; the deadlock test
    // needs data_locks to observe the exact moment a writer blocks on a row.
    const admin = new DataSource(
      createTypeOrmOptions({
        ...database,
        user: 'root',
        password: container.getRootPassword(),
        poolSize: 1,
      }) as DataSourceOptions,
    );
    try {
      await admin.initialize();
      await admin.query(`GRANT SELECT ON performance_schema.* TO \`${container.getUsername()}\`@'%'`);
      await admin.query('FLUSH PRIVILEGES');
    } finally {
      if (admin.isInitialized) {
        await admin.destroy();
      }
    }

    dataSource = new DataSource(createTypeOrmOptions(database) as DataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();

    const clock = {now: () => NOW} as unknown as UtcClock;
    creations = new MovementCreationRepository(dataSource, clock);
    service = new MovementsService(
      new UserProfileRepository(dataSource),
      creations,
      new MovementQueryRepository(dataSource),
      new MovementUpdateRepository(dataSource, clock),
      new MovementReplaceRepository(dataSource, clock),
      new MovementDeleteRepository(dataSource, clock),
      new MovementRevertRepository(dataSource, clock),
      clock,
    );
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
  });

  it('keeps the exact algebraic sum after 100 concurrent income and expense writes', async () => {
    const user = await seedUser('concurrent-100@example.com');
    const account = await seedAccount(user, {
      initialBalance: 100_000,
      currentBalance: 100_000,
    });
    const writes = Array.from({length: 100}, (_, index) => {
      const income = index % 2 === 0;
      return {
        type: income
          ? MovementTypeEnum.INCOME.toString()
          : MovementTypeEnum.EXPENSE.toString(),
        amount: income ? 1_000 : 400,
      };
    });
    const expectedBalance = writes.reduce(
      (balance, write) =>
        balance +
        (write.type === MovementTypeEnum.INCOME.toString() ? write.amount : -write.amount),
      account.initialBalance,
    );
    const gate = createGate();

    const pending = writes.map(async (write) => {
      await gate.opened;
      await service.create(user.publicId, request({...write, accountPublicId: account.publicId}));
    });
    gate.open();
    await Promise.all(pending);

    const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id});
    expect(stored.currentBalance).toBe(expectedBalance);
    expect(stored.version).toBe(100);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(100);
    await expectLedgerInvariant([account]);
  });

  it('commits opposite transfers between the same pair without a deadlock', async () => {
    const user = await seedUser('concurrent-transfers@example.com');
    const first = await seedAccount(user, {
      name: 'Origen',
      initialBalance: 50_000,
      currentBalance: 50_000,
    });
    const second = await seedAccount(user, {
      name: 'Destino',
      type: AccountTypeEnum.SAVINGS.toString(),
      initialBalance: 50_000,
      currentBalance: 50_000,
    });
    const transfers = [
      request({
        type: MovementTypeEnum.TRANSFER.toString(),
        amount: 7_000,
        accountPublicId: first.publicId,
        targetAccountPublicId: second.publicId,
      }),
      request({
        type: MovementTypeEnum.TRANSFER.toString(),
        amount: 3_000,
        accountPublicId: second.publicId,
        targetAccountPublicId: first.publicId,
      }),
    ];
    const gate = createGate();

    const pending = transfers.map(async (transfer) => {
      await gate.opened;
      await service.create(user.publicId, transfer);
    });
    gate.open();
    await Promise.all(pending);

    const repository = dataSource.getRepository(AccountEntity);
    const storedFirst = await repository.findOneByOrFail({id: first.id});
    const storedSecond = await repository.findOneByOrFail({id: second.id});
    expect(storedFirst.currentBalance).toBe(46_000);
    expect(storedSecond.currentBalance).toBe(54_000);
    expect(storedFirst.version).toBe(2);
    expect(storedSecond.version).toBe(2);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(2);
    await expectLedgerInvariant([first, second]);
  });

  it('retries a forced deadlock once and commits a single movement', async () => {
    const user = await seedUser('deadlock-retry@example.com');
    const account = await seedAccount(user, {
      initialBalance: 20_000,
      currentBalance: 20_000,
    });
    const runner = dataSource.createQueryRunner();
    const transactionSpy = jest.spyOn(dataSource, 'transaction');
    let pending: Promise<unknown> | undefined;

    await runner.connect();
    try {
      await runner.startTransaction('READ COMMITTED');
      await runner.query('SELECT id FROM accounts WHERE id = ? FOR UPDATE', [account.id]);
      // A heavy undo log biases InnoDB's victim choice to the ledger write.
      for (let index = 0; index < 60; index += 1) {
        await runner.query('UPDATE accounts SET note = ? WHERE id = ?', [
          `deadlock-bias-${index}`,
          account.id,
        ]);
      }

      pending = service.create(
        user.publicId,
        request({amount: 5_000, accountPublicId: account.publicId}),
      );
      await waitUntil('the ledger write to block on the account row', async () => {
        const rows = (await dataSource.query(
          `SELECT COUNT(*) AS waiting
             FROM performance_schema.data_locks
            WHERE OBJECT_SCHEMA = DATABASE()
              AND OBJECT_NAME = 'accounts'
              AND LOCK_STATUS = 'WAITING'`,
        )) as Array<{waiting: number | string}>;
        return Number(rows[0]?.waiting ?? 0) > 0;
      });

      // Reverse lock order: account → user closes the cycle with the ledger write.
      await runner.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);
      await runner.commitTransaction();

      const result = await pending;
      expect(result).toMatchObject({movement: {amount: 5_000, type: MovementTypeEnum.INCOME.toString()}});
      expect(transactionSpy).toHaveBeenCalledTimes(2);

      const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({
        id: account.id,
      });
      expect(stored.currentBalance).toBe(25_000);
      expect(stored.version).toBe(1);
      expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
      await expectLedgerInvariant([account]);
    } finally {
      if (runner.isTransactionActive) {
        await runner.rollbackTransaction();
      }
      await runner.release();
      if (pending) {
        await pending.catch(() => undefined);
      }
      transactionSpy.mockRestore();
    }
  });
});

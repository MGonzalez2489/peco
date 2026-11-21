import type {CategoryApplyType, CreateMovementRequest} from '@peco/contracts';
import {AccountTypeEnum, CategoryApplyTypeEnum, MovementTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../database/entities';
import {CategoryRepository} from '../categories/services/category.repository';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import type {ListMovementsQueryDto} from './dto/list-movements-query.dto';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementQueryRepository} from './services/movement-query.repository';

jest.setTimeout(180_000);

const DATE = '2026-11-15T10:00:00.000Z';

describe('ledger creation (MySQL 8, US-501)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: MovementsService;

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

  const seedCategory = async (
    user: UserEntity | null,
    applyType: CategoryApplyType,
  ): Promise<CategoryEntity> =>
    dataSource.getRepository(CategoryEntity).save(
      dataSource.getRepository(CategoryEntity).create({
        userId: user?.id ?? null,
        name: `categoria-${Math.random().toString(36).slice(2, 8)}`,
        displayName: 'Categoría',
        icon: 'tag',
        color: '#F97316',
        applyType,
        isRoot: false,
        isSystem: false,
        deletedAt: null,
      }),
    );

  const seedMovement = async (
    user: UserEntity,
    account: AccountEntity,
    category: CategoryEntity,
    overrides: Partial<MovementEntity> = {},
  ): Promise<MovementEntity> =>
    dataSource.getRepository(MovementEntity).save(
      dataSource.getRepository(MovementEntity).create({
        userId: user.id,
        accountId: account.id,
        targetAccountId: null,
        categoryId: category.id,
        type: MovementTypeEnum.INCOME.toString(),
        amount: 1000,
        date: DATE,
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

  const list = (overrides: Partial<ListMovementsQueryDto> = {}): ListMovementsQueryDto =>
    ({period: '2026-11', limit: 20, ...overrides}) as ListMovementsQueryDto;

  const seedClosedPeriod = async (user: UserEntity): Promise<void> => {
    await dataSource.getRepository(PeriodSnapshotEntity).save(
      dataSource.getRepository(PeriodSnapshotEntity).create({
        userId: user.id,
        period: DATE.slice(0, 7),
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        globalInitialBalance: 0,
        globalFinalBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        totalTransfers: 0,
        totalTransactionsCount: 0,
      }),
    );
  };

  const request = (overrides: Partial<CreateMovementRequest> = {}): CreateMovementRequest => ({
    type: MovementTypeEnum.INCOME.toString(),
    amount: 3000,
    date: DATE,
    accountPublicId: 'missing',
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

    const clock = new UtcClock();
    service = new MovementsService(
      new UserProfileRepository(dataSource),
      new MovementCreationRepository(dataSource, clock),
      new MovementQueryRepository(dataSource),
      clock,
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM movements');
    await dataSource.query('DELETE FROM periodSnapshots');
    await dataSource.query('DELETE FROM accounts');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM users');
    await new CategoryRepository(dataSource).ensureSystemCatalog();
  });

  it('applies an income in integer cents and returns the refreshed account card', async () => {
    const user = await seedUser('income@example.com');
    const source = await seedAccount(user, {currentBalance: 100000, version: 2});

    const result = await service.create(
      user.publicId,
      request({accountPublicId: source.publicId}),
    );

    expect(result.balances).toEqual([
      {accountPublicId: source.publicId, currentBalance: 103000, version: 3},
    ]);
    expect(result.movement).toMatchObject({amount: 3000, type: 'INCOME', version: 0});
    expect(result.movement.category.name).toBe('unknown');
    expect(Object.keys(result.movement)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'accountId', 'categoryId']),
    );

    const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: source.id});
    expect(stored.currentBalance).toBe(103000);
    expect(stored.version).toBe(3);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
  });

  it('rolls back an expense that would overdraw a non-credit account', async () => {
    const user = await seedUser('expense@example.com');
    const source = await seedAccount(user, {currentBalance: 1000});

    await expect(
      service.create(
        user.publicId,
        request({
          type: MovementTypeEnum.EXPENSE.toString(),
          amount: 2000,
          accountPublicId: source.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 409, code: 'NEGATIVE_BALANCE_NOT_ALLOWED'});

    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
    expect((await dataSource.getRepository(AccountEntity).findOneByOrFail({id: source.id})).currentBalance).toBe(
      1000,
    );
  });

  it('allows a credit account to go negative on an expense', async () => {
    const user = await seedUser('credit@example.com');
    const source = await seedAccount(user, {
      type: AccountTypeEnum.CREDIT.toString(),
      currentBalance: 0,
      creditLimit: 1000000,
    });

    const result = await service.create(
      user.publicId,
      request({
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 150000,
        accountPublicId: source.publicId,
      }),
    );

    expect(result.balances[0].currentBalance).toBe(-150000);
  });

  it('moves funds between two owned accounts with both balances in the response', async () => {
    const user = await seedUser('transfer@example.com');
    const source = await seedAccount(user, {name: 'Origen', currentBalance: 5000});
    const target = await seedAccount(user, {name: 'Destino', currentBalance: 2000});

    const result = await service.create(
      user.publicId,
      request({
        type: MovementTypeEnum.TRANSFER.toString(),
        amount: 1000,
        accountPublicId: source.publicId,
        targetAccountPublicId: target.publicId,
      }),
    );

    expect(result.balances).toEqual([
      {accountPublicId: source.publicId, currentBalance: 4000, version: 1},
      {accountPublicId: target.publicId, currentBalance: 3000, version: 1},
    ]);
    expect(result.movement.targetAccount?.publicId).toBe(target.publicId);
    expect(result.movement.category.name).toBe('transfer');
  });

  it('rejects a missing, self-referential or foreign transfer destination', async () => {
    const user = await seedUser('destination@example.com');
    const otherUser = await seedUser('other@example.com');
    const source = await seedAccount(user, {currentBalance: 5000});
    const foreign = await seedAccount(otherUser, {currentBalance: 5000});

    const base = request({
      type: MovementTypeEnum.TRANSFER.toString(),
      amount: 1000,
      accountPublicId: source.publicId,
    });

    await expect(service.create(user.publicId, base)).rejects.toMatchObject({
      status: 409,
      code: 'TRANSFER_REQUIRED',
    });
    await expect(
      service.create(
        user.publicId,
        request({
          ...base,
          targetAccountPublicId: source.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 422, code: 'UNPROCESSABLE_ENTITY'});
    await expect(
      service.create(
        user.publicId,
        request({...base, targetAccountPublicId: foreign.publicId}),
      ),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});

    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('rejects a date inside a closed period without writing anything', async () => {
    const user = await seedUser('closed@example.com');
    const source = await seedAccount(user, {currentBalance: 100000});
    await seedClosedPeriod(user);

    await expect(
      service.create(user.publicId, request({accountPublicId: source.publicId})),
    ).rejects.toMatchObject({status: 409, code: 'PERIOD_CLOSED'});

    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
    expect((await dataSource.getRepository(AccountEntity).findOneByOrFail({id: source.id})).currentBalance).toBe(
      100000,
    );
  });

  it('rejects a category that does not accept the movement type', async () => {
    const user = await seedUser('category@example.com');
    const source = await seedAccount(user, {currentBalance: 100000});
    const category = await seedCategory(user, CategoryApplyTypeEnum.INCOME.toString());

    await expect(
      service.create(
        user.publicId,
        request({
          type: MovementTypeEnum.EXPENSE.toString(),
          accountPublicId: source.publicId,
          categoryPublicId: category.publicId,
        }),
      ),
    ).rejects.toMatchObject({status: 422, code: 'CATEGORY_NOT_COMPATIBLE'});

    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('serializes concurrent movements on the same account without losing an update', async () => {
    const user = await seedUser('concurrent@example.com');
    const source = await seedAccount(user, {currentBalance: 10000});

    await Promise.all([
      service.create(
        user.publicId,
        request({type: MovementTypeEnum.EXPENSE.toString(), amount: 3000, accountPublicId: source.publicId}),
      ),
      service.create(
        user.publicId,
        request({type: MovementTypeEnum.EXPENSE.toString(), amount: 4000, accountPublicId: source.publicId}),
      ),
    ]);

    const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: source.id});
    expect(stored.currentBalance).toBe(3000);
    expect(stored.version).toBe(2);
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(2);
  });

  it('orders by date/id desc, paginates with an opaque cursor and totals the whole filter', async () => {
    const user = await seedUser('list@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    await seedMovement(user, account, category, {
      date: '2026-11-10T10:00:00.000Z',
      amount: 1000,
    });
    await seedMovement(user, account, category, {
      date: '2026-11-12T10:00:00.000Z',
      amount: 3000,
      type: MovementTypeEnum.INCOME.toString(),
    });
    await seedMovement(user, account, category, {
      date: '2026-11-12T10:00:00.000Z',
      amount: 2000,
      type: MovementTypeEnum.EXPENSE.toString(),
    });

    const first = await service.list(user.publicId, list({limit: 2}));
    expect(first.items.map((item) => item.amount)).toEqual([2000, 3000]);
    expect(first.nextCursor).toEqual(expect.any(String));
    expect(first.totals).toEqual({
      totalIncome: 4000,
      totalExpenses: 2000,
      netBalance: 2000,
      count: 3,
    });

    const second = await service.list(
      user.publicId,
      list({limit: 2, cursor: first.nextCursor ?? undefined}),
    );
    expect(second.items.map((item) => item.amount)).toEqual([1000]);
    expect(second.nextCursor).toBeNull();
    expect(second.totals).toEqual(first.totals);
  });

  it('matches a transfer by destination and counts it once without double-counting its amount', async () => {
    const user = await seedUser('transfer-list@example.com');
    const source = await seedAccount(user, {name: 'Origen'});
    const target = await seedAccount(user, {name: 'Destino', type: AccountTypeEnum.SAVINGS.toString()});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const transfer = await seedMovement(user, source, category, {
      targetAccountId: target.id,
      type: MovementTypeEnum.TRANSFER.toString(),
      amount: 5000,
    });

    const byDestination = await service.list(
      user.publicId,
      list({accountPublicId: target.publicId}),
    );
    expect(byDestination.items.map((item) => item.publicId)).toEqual([transfer.publicId]);
    expect(byDestination.items[0]?.targetAccount?.publicId).toBe(target.publicId);
    expect(byDestination.totals).toEqual({
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      count: 1,
    });

    const byAccountType = await service.list(
      user.publicId,
      list({accountType: AccountTypeEnum.SAVINGS.toString()}),
    );
    expect(byAccountType.totals.count).toBe(1);
  });

  it('filters by case-insensitive note, category, reversals, canceled rows and soft deletes', async () => {
    const user = await seedUser('filters@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    await seedMovement(user, account, category, {note: 'Supermercado', amount: 5000});
    await seedMovement(user, account, category, {note: 'Farmacia', amount: 1000});
    await seedMovement(user, account, category, {
      note: 'Revertido',
      isReversed: true,
      amount: 7000,
    });
    await seedMovement(user, account, category, {
      note: 'Contra',
      isReversal: true,
      amount: 7000,
    });
    await seedMovement(user, account, category, {note: 'Cancelado', isCanceled: true, amount: 9000});
    await seedMovement(user, account, category, {
      note: 'Borrado',
      amount: 8000,
      deletedAt: '2026-11-20T00:00:00.000Z',
    });

    const byNote = await service.list(user.publicId, list({note: ' SUPER '}));
    expect(byNote.items.map((item) => item.note)).toEqual(['Supermercado']);
    expect(byNote.totals.count).toBe(1);

    const byCategory = await service.list(user.publicId, list({categoryPublicId: category.publicId}));
    expect(byCategory.totals.count).toBe(5);

    const strict = await service.list(
      user.publicId,
      list({excludeReversals: true, includeCanceled: false}),
    );
    expect(strict.items.map((item) => item.note)).toEqual(['Farmacia', 'Supermercado']);
    expect(strict.totals).toEqual({
      totalIncome: 6000,
      totalExpenses: 0,
      netBalance: 6000,
      count: 2,
    });

    const all = await service.list(user.publicId, list());
    expect(all.totals).toEqual({
      totalIncome: 20000,
      totalExpenses: 0,
      netBalance: 20000,
      count: 5,
    });
  });

  it('returns an empty page for foreign account and category filters', async () => {
    const user = await seedUser('owner@example.com');
    const other = await seedUser('foreign@example.com');
    const account = await seedAccount(user);
    const foreignAccount = await seedAccount(other);
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const foreignCategory = await seedCategory(other, CategoryApplyTypeEnum.BOTH.toString());
    await seedMovement(user, account, category);

    const byForeignAccount = await service.list(
      user.publicId,
      list({accountPublicId: foreignAccount.publicId}),
    );
    expect(byForeignAccount.items).toEqual([]);
    expect(byForeignAccount.totals.count).toBe(0);

    const byForeignCategory = await service.list(
      user.publicId,
      list({categoryPublicId: foreignCategory.publicId}),
    );
    expect(byForeignCategory.items).toEqual([]);
    expect(byForeignCategory.totals.count).toBe(0);
  });

  it('applies inclusive from/to bounds and rejects an inactive caller', async () => {
    const user = await seedUser('range@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    await seedMovement(user, account, category, {date: '2025-12-31T23:59:59.999Z'});
    await seedMovement(user, account, category, {date: '2026-01-01T00:00:00.000Z', amount: 2000});
    await seedMovement(user, account, category, {date: '2026-02-01T00:00:00.000Z', amount: 4000});

    const ranged = await service.list(
      user.publicId,
      list({period: undefined, from: '2026-01-01', to: '2026-01-31'}),
    );
    expect(ranged.items.map((item) => item.amount)).toEqual([2000]);
    expect(ranged.totals.count).toBe(1);

    await dataSource.getRepository(UserEntity).update({id: user.id}, {deletedAt: DATE});
    await expect(service.list(user.publicId, list())).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

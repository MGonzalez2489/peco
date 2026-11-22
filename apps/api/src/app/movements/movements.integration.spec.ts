import type {
  CategoryApplyType,
  CreateMovementRequest,
  UpdateMovementRequest,
} from '@peco/contracts';
import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  AuditLogEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../database/entities';
import {CategoryRepository} from '../categories/services/category.repository';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import type {ListMovementsQueryDto} from './dto/list-movements-query.dto';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementDeleteRepository} from './services/movement-delete.repository';
import {MovementQueryRepository} from './services/movement-query.repository';
import {MovementReplaceRepository} from './services/movement-replace.repository';
import {MovementUpdateRepository} from './services/movement-update.repository';

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

  const seedSchedule = async (
    user: UserEntity,
    account: AccountEntity,
    category: CategoryEntity,
  ): Promise<ScheduledTransactionEntity> =>
    dataSource.getRepository(ScheduledTransactionEntity).save(
      dataSource.getRepository(ScheduledTransactionEntity).create({
        userId: user.id,
        name: 'Alquiler',
        estimatedAmount: 50000,
        type: ScheduledTransactionTypeEnum.EXPENSE.toString(),
        categoryId: category.id,
        sourceAccountId: account.id,
        destinationAccountId: null,
        frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
        interval: 1,
        anchorDate: '2026-11-15',
        nextContemplatedDate: '2026-11-15',
        nextExecutionDate: '2026-11-15',
        autoApply: false,
        active: true,
        totalOccurrences: null,
        completedOccurrences: 0,
        endDate: null,
        version: 0,
        deletedAt: null,
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

  const edit = (overrides: Partial<UpdateMovementRequest> = {}): UpdateMovementRequest => ({
    version: 0,
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
      new MovementUpdateRepository(dataSource, clock),
      new MovementReplaceRepository(dataSource, clock),
      new MovementDeleteRepository(dataSource, clock),
      clock,
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM auditLogs');
    await dataSource.query('DELETE FROM movements');
    await dataSource.query('DELETE FROM scheduledTransactions');
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

  it('resolves state links to public ids, even when the replaced original is soft-deleted', async () => {
    const user = await seedUser('detail@example.com');
    const account = await seedAccount(user);
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const schedule = await seedSchedule(user, account, category);
    const original = await seedMovement(user, account, category, {isReversed: true});
    const replacement = await seedMovement(user, account, category, {
      replacesMovementId: original.id,
    });
    const contra = await seedMovement(user, account, category, {
      isReversal: true,
      reversalId: replacement.id,
      scheduledTransactionId: schedule.id,
    });
    await dataSource.getRepository(MovementEntity).update({id: original.id}, {deletedAt: DATE});

    const detail = await service.findOne(user.publicId, contra.publicId);
    expect(detail).toMatchObject({
      publicId: contra.publicId,
      isReversal: true,
      isReversed: false,
      isCanceled: false,
      reversalOfPublicId: replacement.publicId,
      replacesPublicId: null,
      scheduledTransactionPublicId: schedule.publicId,
      account: {publicId: account.publicId},
      category: {publicId: category.publicId},
    });

    const replacementDetail = await service.findOne(user.publicId, replacement.publicId);
    expect(replacementDetail.replacesPublicId).toBe(original.publicId);
    expect(Object.keys(replacementDetail)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'accountId', 'categoryId', 'replacesMovementId']),
    );

    const listed = await service.list(user.publicId, list());
    expect(
      listed.items.find((item) => item.publicId === replacement.publicId)?.replacesPublicId,
    ).toBe(original.publicId);
  });

  it('hides soft-deleted, foreign and unknown movements behind 404 MOVEMENT_NOT_FOUND', async () => {
    const user = await seedUser('detail-owner@example.com');
    const other = await seedUser('detail-foreign@example.com');
    const account = await seedAccount(user);
    const foreignAccount = await seedAccount(other);
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const own = await seedMovement(user, account, category);
    const foreign = await seedMovement(other, foreignAccount, category);
    await dataSource.getRepository(MovementEntity).update({id: own.id}, {deletedAt: DATE});

    for (const publicId of [own.publicId, foreign.publicId, 'unknown-public-id']) {
      await expect(service.findOne(user.publicId, publicId)).rejects.toMatchObject({
        status: 404,
        code: 'MOVEMENT_NOT_FOUND',
      });
    }
  });

  it('applies the amount delta, bumps versions and writes one EDIT audit row', async () => {
    const user = await seedUser('edit-amount@example.com');
    const account = await seedAccount(user, {currentBalance: 550});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const movement = await seedMovement(user, account, category, {
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 450,
    });

    const result = await service.update(user.publicId, movement.publicId, edit({amount: 500}));

    expect(result.movement).toMatchObject({
      publicId: movement.publicId,
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 500,
      date: DATE,
      version: 1,
    });
    expect(result.balances).toEqual([
      {accountPublicId: account.publicId, currentBalance: 500, version: 1},
    ]);

    const storedMovement = await dataSource
      .getRepository(MovementEntity)
      .findOneByOrFail({id: movement.id});
    expect(storedMovement).toMatchObject({amount: 500, version: 1, date: DATE});

    const storedAccount = await dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({id: account.id});
    expect(storedAccount).toMatchObject({currentBalance: 500, version: 1});

    const audit = await dataSource
      .getRepository(AuditLogEntity)
      .findOneByOrFail({userId: user.id});
    expect(audit).toMatchObject({
      entity: 'movements',
      entityId: movement.publicId,
      action: 'EDIT',
    });
    expect(audit.before).toMatchObject({amount: 450, version: 0});
    expect(audit.after).toMatchObject({amount: 500, version: 1});
  });

  it('nets the impact when the source account changes', async () => {
    const user = await seedUser('edit-source@example.com');
    const source = await seedAccount(user, {name: 'A', currentBalance: 550});
    const destination = await seedAccount(user, {name: 'B', currentBalance: 1000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const movement = await seedMovement(user, source, category, {
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 450,
    });

    const result = await service.update(
      user.publicId,
      movement.publicId,
      edit({accountPublicId: destination.publicId}),
    );

    expect(result.movement.account.publicId).toBe(destination.publicId);
    expect(result.balances).toEqual(
      expect.arrayContaining([
        {accountPublicId: source.publicId, currentBalance: 1000, version: 1},
        {accountPublicId: destination.publicId, currentBalance: 550, version: 1},
      ]),
    );

    const audit = await dataSource
      .getRepository(AuditLogEntity)
      .findOneByOrFail({userId: user.id});
    expect(audit.before).toMatchObject({accountPublicId: source.publicId});
    expect(audit.after).toMatchObject({accountPublicId: destination.publicId});
  });

  it('nets the impact when a transfer destination changes without touching the source', async () => {
    const user = await seedUser('edit-target@example.com');
    const source = await seedAccount(user, {name: 'A', currentBalance: 4000});
    const oldTarget = await seedAccount(user, {name: 'B', currentBalance: 3000});
    const newTarget = await seedAccount(user, {name: 'C', currentBalance: 2000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const movement = await seedMovement(user, source, category, {
      type: MovementTypeEnum.TRANSFER.toString(),
      amount: 1000,
      targetAccountId: oldTarget.id,
    });

    const result = await service.update(
      user.publicId,
      movement.publicId,
      edit({targetAccountPublicId: newTarget.publicId}),
    );

    expect(result.movement.targetAccount?.publicId).toBe(newTarget.publicId);
    expect(result.balances).toEqual([
      {accountPublicId: oldTarget.publicId, currentBalance: 2000, version: 1},
      {accountPublicId: newTarget.publicId, currentBalance: 3000, version: 1},
    ]);

    const sourceAfter = await dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({id: source.id});
    expect(sourceAfter).toMatchObject({currentBalance: 4000, version: 0});
  });

  it('rejects a stale version without writing balances, movement or audit', async () => {
    const user = await seedUser('edit-conflict@example.com');
    const account = await seedAccount(user, {currentBalance: 1000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const movement = await seedMovement(user, account, category, {amount: 1000});

    await expect(
      service.update(user.publicId, movement.publicId, edit({amount: 2000, version: 1})),
    ).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      details: {expectedVersion: 1, currentVersion: 0},
    });

    const storedAccount = await dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({id: account.id});
    const storedMovement = await dataSource
      .getRepository(MovementEntity)
      .findOneByOrFail({id: movement.id});
    expect(storedAccount).toMatchObject({currentBalance: 1000, version: 0});
    expect(storedMovement).toMatchObject({amount: 1000, version: 0});
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('rejects an edit of a closed period', async () => {
    const user = await seedUser('edit-closed@example.com');
    const account = await seedAccount(user, {currentBalance: 1000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const movement = await seedMovement(user, account, category, {amount: 1000});
    await seedClosedPeriod(user);

    await expect(
      service.update(user.publicId, movement.publicId, edit({amount: 2000})),
    ).rejects.toMatchObject({status: 409, code: 'PERIOD_CLOSED'});
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('rejects canceled, reversed and contra movements', async () => {
    const user = await seedUser('edit-locked@example.com');
    const account = await seedAccount(user, {currentBalance: 1000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());

    for (const flag of ['isCanceled', 'isReversed', 'isReversal'] as const) {
      const movement = await seedMovement(user, account, category, {[flag]: true});

      await expect(
        service.update(user.publicId, movement.publicId, edit({amount: 2000})),
      ).rejects.toMatchObject({status: 409, code: 'MOVEMENT_LOCKED'});
    }
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('rolls back an edit that would leave a non-credit account negative', async () => {
    const user = await seedUser('edit-negative@example.com');
    const account = await seedAccount(user, {currentBalance: 100});
    const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
    const movement = await seedMovement(user, account, category, {
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 50,
    });

    await expect(
      service.update(user.publicId, movement.publicId, edit({amount: 200})),
    ).rejects.toMatchObject({status: 409, code: 'NEGATIVE_BALANCE_NOT_ALLOWED'});

    const storedAccount = await dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({id: account.id});
    expect(storedAccount).toMatchObject({currentBalance: 100, version: 0});
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('hides soft-deleted movements behind 404 MOVEMENT_NOT_FOUND', async () => {
    const user = await seedUser('edit-deleted@example.com');
    const account = await seedAccount(user, {currentBalance: 1000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const movement = await seedMovement(user, account, category, {amount: 1000});
    await dataSource.getRepository(MovementEntity).update({id: movement.id}, {deletedAt: DATE});

    await expect(
      service.update(user.publicId, movement.publicId, edit({amount: 2000})),
    ).rejects.toMatchObject({status: 404, code: 'MOVEMENT_NOT_FOUND'});
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('rejects an immutable date before writing', async () => {
    const user = await seedUser('edit-immutable@example.com');
    const account = await seedAccount(user, {currentBalance: 1000});
    const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
    const movement = await seedMovement(user, account, category, {amount: 1000});

    await expect(
      service.update(user.publicId, movement.publicId, {
        ...edit({amount: 2000}),
        date: DATE,
      } as never),
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {date: expect.any(String)}},
    });
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  describe('type change as atomic replace (US-505)', () => {
    it('retires the original, inserts a replacement and applies the net delta', async () => {
      const user = await seedUser('replace-basic@example.com');
      const account = await seedAccount(user, {currentBalance: 550});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 450,
      });

      const result = await service.update(user.publicId, movement.publicId, {
        type: MovementTypeEnum.INCOME.toString(),
        note: 'Reemplazo',
        version: 0,
      });

      expect(result.replacedPublicId).toBe(movement.publicId);
      expect(result.movement).toMatchObject({
        type: MovementTypeEnum.INCOME.toString(),
        amount: 450,
        date: DATE,
        note: 'Reemplazo',
        version: 0,
        replacesPublicId: movement.publicId,
      });
      expect(result.movement.publicId).not.toBe(movement.publicId);
      expect(result.balances).toEqual([
        {accountPublicId: account.publicId, currentBalance: 1450, version: 1},
      ]);

      const rows = await dataSource.getRepository(MovementEntity).find({where: {userId: user.id}});
      expect(rows).toHaveLength(2);
      const retired = rows.find((row) => row.id === movement.id);
      const replacement = rows.find((row) => row.id !== movement.id);
      expect(retired).toMatchObject({deletedAt: expect.any(String), version: 1});
      expect(replacement).toMatchObject({
        type: MovementTypeEnum.INCOME.toString(),
        replacesMovementId: movement.id,
        version: 0,
        deletedAt: null,
      });

      await expect(service.findOne(user.publicId, movement.publicId)).rejects.toMatchObject({
        status: 404,
        code: 'MOVEMENT_NOT_FOUND',
      });
      const detail = await service.findOne(user.publicId, result.movement.publicId);
      expect(detail.replacesPublicId).toBe(movement.publicId);

      const audit = await dataSource
        .getRepository(AuditLogEntity)
        .findOneByOrFail({userId: user.id});
      expect(audit).toMatchObject({entity: 'movements', action: 'REPLACE'});
      expect(audit.before).toMatchObject({publicId: movement.publicId, version: 0});
      expect(audit.after).toMatchObject({
        publicId: result.movement.publicId,
        version: 0,
        replacesPublicId: movement.publicId,
      });
    });

    it('requires a distinct target when switching to a transfer', async () => {
      const user = await seedUser('replace-transfer-required@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {amount: 1000});

      await expect(
        service.update(user.publicId, movement.publicId, {
          type: MovementTypeEnum.TRANSFER.toString(),
        }),
      ).rejects.toMatchObject({status: 409, code: 'TRANSFER_REQUIRED'});

      await expect(
        service.update(user.publicId, movement.publicId, {
          type: MovementTypeEnum.TRANSFER.toString(),
          targetAccountPublicId: account.publicId,
        }),
      ).rejects.toMatchObject({status: 422, code: 'UNPROCESSABLE_ENTITY'});
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });

    it('drops the target when switching away from a transfer', async () => {
      const user = await seedUser('replace-drop-target@example.com');
      const source = await seedAccount(user, {currentBalance: 4000});
      const target = await seedAccount(user, {name: 'B', currentBalance: 3000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, source, category, {
        type: MovementTypeEnum.TRANSFER.toString(),
        amount: 1000,
        targetAccountId: target.id,
      });

      const result = await service.update(user.publicId, movement.publicId, {
        type: MovementTypeEnum.EXPENSE.toString(),
      });

      expect(result.movement.targetAccount).toBeNull();
      expect(result.balances).toEqual([
        {accountPublicId: target.publicId, currentBalance: 2000, version: 1},
      ]);

      const sourceAfter = await dataSource
        .getRepository(AccountEntity)
        .findOneByOrFail({id: source.id});
      expect(sourceAfter).toMatchObject({currentBalance: 4000, version: 0});
    });

    it('rejects a category that does not accept the new type', async () => {
      const user = await seedUser('replace-category@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.EXPENSE.toString());
      const movement = await seedMovement(user, account, category, {
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 100,
      });

      await expect(
        service.update(user.publicId, movement.publicId, {
          type: MovementTypeEnum.INCOME.toString(),
        }),
      ).rejects.toMatchObject({status: 422, code: 'CATEGORY_NOT_COMPATIBLE'});
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });

    it('rolls back the whole replace when a non-credit account would go negative', async () => {
      const user = await seedUser('replace-negative@example.com');
      const account = await seedAccount(user, {currentBalance: 100});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {
        type: MovementTypeEnum.INCOME.toString(),
        amount: 50,
      });

      await expect(
        service.update(user.publicId, movement.publicId, {
          type: MovementTypeEnum.EXPENSE.toString(),
          amount: 200,
        }),
      ).rejects.toMatchObject({status: 409, code: 'NEGATIVE_BALANCE_NOT_ALLOWED'});

      const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id});
      expect(stored).toMatchObject({currentBalance: 100, version: 0});
      expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });

    it('rejects a type change in a closed period or on a scheduled movement', async () => {
      const user = await seedUser('replace-locked@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const closedMovement = await seedMovement(user, account, category, {amount: 100});
      await seedClosedPeriod(user);

      await expect(
        service.update(user.publicId, closedMovement.publicId, {
          type: MovementTypeEnum.EXPENSE.toString(),
        }),
      ).rejects.toMatchObject({status: 409, code: 'PERIOD_CLOSED'});

      const schedule = await seedSchedule(user, account, category);
      const scheduledMovement = await seedMovement(user, account, category, {
        amount: 100,
        scheduledTransactionId: schedule.id,
      });
      await expect(
        service.update(user.publicId, scheduledMovement.publicId, {
          type: MovementTypeEnum.EXPENSE.toString(),
        }),
      ).rejects.toMatchObject({status: 409, code: 'MOVEMENT_LOCKED'});
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });

    it('rejects a stale version without writing anything', async () => {
      const user = await seedUser('replace-conflict@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {amount: 100});

      await expect(
        service.update(user.publicId, movement.publicId, {
          type: MovementTypeEnum.EXPENSE.toString(),
          version: 1,
        }),
      ).rejects.toMatchObject({
        status: 409,
        code: 'VERSION_CONFLICT',
        details: {expectedVersion: 1, currentVersion: 0},
      });
      expect(await dataSource.getRepository(MovementEntity).count()).toBe(1);
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });
  });

  describe('soft delete with inverse impact (US-506)', () => {
    it('reverts an expense, retires the row and rejects a second delete', async () => {
      const user = await seedUser('delete-basic@example.com');
      const account = await seedAccount(user, {currentBalance: 550});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 450,
      });

      const result = await service.remove(user.publicId, movement.publicId);

      expect(result).toEqual({
        deletedPublicId: movement.publicId,
        balances: [{accountPublicId: account.publicId, currentBalance: 1000, version: 1}],
      });

      const stored = await dataSource.getRepository(MovementEntity).findOneByOrFail({id: movement.id});
      expect(stored).toMatchObject({deletedAt: expect.any(String), version: 1});

      await expect(service.findOne(user.publicId, movement.publicId)).rejects.toMatchObject({
        status: 404,
        code: 'MOVEMENT_NOT_FOUND',
      });
      await expect(service.remove(user.publicId, movement.publicId)).rejects.toMatchObject({
        status: 404,
        code: 'MOVEMENT_NOT_FOUND',
      });

      const audit = await dataSource
        .getRepository(AuditLogEntity)
        .findOneByOrFail({userId: user.id});
      expect(audit).toMatchObject({entity: 'movements', action: 'DELETE', after: null});
      expect(audit.before).toMatchObject({publicId: movement.publicId, version: 0});
    });

    it('restores both sides of a transfer and reports only changed accounts', async () => {
      const user = await seedUser('delete-transfer@example.com');
      const source = await seedAccount(user, {name: 'A', currentBalance: 4000});
      const target = await seedAccount(user, {name: 'B', currentBalance: 3000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, source, category, {
        type: MovementTypeEnum.TRANSFER.toString(),
        amount: 1000,
        targetAccountId: target.id,
      });

      const result = await service.remove(user.publicId, movement.publicId);

      expect(result.balances).toEqual(
        expect.arrayContaining([
          {accountPublicId: source.publicId, currentBalance: 5000, version: 1},
          {accountPublicId: target.publicId, currentBalance: 2000, version: 1},
        ]),
      );
    });

    it('deletes a canceled movement without touching any balance', async () => {
      const user = await seedUser('delete-canceled@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 1000,
        isCanceled: true,
      });

      const result = await service.remove(user.publicId, movement.publicId);

      expect(result.balances).toEqual([]);
      const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id});
      expect(stored).toMatchObject({currentBalance: 1000, version: 0});
      const row = await dataSource.getRepository(MovementEntity).findOneByOrFail({id: movement.id});
      expect(row.deletedAt).toEqual(expect.any(String));
    });

    it('rejects a closed period without writing anything', async () => {
      const user = await seedUser('delete-closed@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {amount: 100});
      await seedClosedPeriod(user);

      await expect(service.remove(user.publicId, movement.publicId)).rejects.toMatchObject({
        status: 409,
        code: 'PERIOD_CLOSED',
      });

      const stored = await dataSource.getRepository(MovementEntity).findOneByOrFail({id: movement.id});
      expect(stored.deletedAt).toBeNull();
      const balance = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id});
      expect(balance).toMatchObject({currentBalance: 1000, version: 0});
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });

    it('rejects a reversal and an already reversed original', async () => {
      const user = await seedUser('delete-locked@example.com');
      const account = await seedAccount(user, {currentBalance: 1000});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const reversal = await seedMovement(user, account, category, {
        type: MovementTypeEnum.EXPENSE.toString(),
        isReversal: true,
      });
      const reversed = await seedMovement(user, account, category, {
        type: MovementTypeEnum.INCOME.toString(),
        isReversed: true,
      });

      await expect(service.remove(user.publicId, reversal.publicId)).rejects.toMatchObject({
        status: 409,
        code: 'MOVEMENT_LOCKED',
      });
      await expect(service.remove(user.publicId, reversed.publicId)).rejects.toMatchObject({
        status: 409,
        code: 'MOVEMENT_LOCKED',
      });
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });

    it('rolls back when the inverse impact would overdraw a non-credit account', async () => {
      const user = await seedUser('delete-negative@example.com');
      const account = await seedAccount(user, {currentBalance: 30});
      const category = await seedCategory(null, CategoryApplyTypeEnum.BOTH.toString());
      const movement = await seedMovement(user, account, category, {
        type: MovementTypeEnum.INCOME.toString(),
        amount: 50,
      });

      await expect(service.remove(user.publicId, movement.publicId)).rejects.toMatchObject({
        status: 409,
        code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
      });

      const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id});
      expect(stored).toMatchObject({currentBalance: 30, version: 0});
      const row = await dataSource.getRepository(MovementEntity).findOneByOrFail({id: movement.id});
      expect(row.deletedAt).toBeNull();
      expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    });
  });
});

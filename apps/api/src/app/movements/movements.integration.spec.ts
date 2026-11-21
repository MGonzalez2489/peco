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
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';

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
});

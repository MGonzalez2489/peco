import {AccountTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions, IsNull} from 'typeorm';
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
import {AccountsService} from './accounts.service';
import {AccountDeletionRepository} from './services/account-deletion.repository';
import {AccountRepository} from './services/account.repository';

jest.setTimeout(180_000);

const CREATE_REQUEST = {
  name: 'Ahorros',
  type: AccountTypeEnum.SAVINGS.toString(),
  initialBalance: 500000,
  includeInTotal: true,
  targetGoal: 1000000,
  creditLimit: null,
  color: '#F59E0B',
  icon: 'piggy-bank',
  pinToHome: false,
  note: 'Cuenta de prueba',
};

describe('account flow (MySQL 8, US-301/US-302/US-303/US-304/US-305)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: AccountsService;

  const seedUser = async (email: string, deletedAt: string | null = null): Promise<UserEntity> =>
    dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: null,
        deletedAt,
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
    service = new AccountsService(
      new UserProfileRepository(dataSource),
      new AccountRepository(dataSource, clock),
      new AccountDeletionRepository(dataSource, clock),
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
  });

  it('returns only active caller accounts ordered by pinned flag and name', async () => {
    const user = await seedUser('user@example.com');
    const otherUser = await seedUser('other@example.com');

    await seedAccount(user, {name: 'Efectivo', isRoot: true});
    await seedAccount(user, {name: 'Zeta', pinToHome: true});
    await seedAccount(user, {name: 'Ahorros', pinToHome: true});
    await seedAccount(user, {
      name: 'Borrada',
      pinToHome: true,
      deletedAt: '2026-11-20T10:00:00.000Z',
    });
    await seedAccount(otherUser, {name: 'Externa', pinToHome: true, isRoot: true});

    const {items} = await service.list(user.publicId);

    expect(items.map((item) => item.name)).toEqual(['Ahorros', 'Zeta', 'Efectivo']);
    for (const item of items) {
      expect(Object.keys(item)).not.toEqual(
        expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
      );
    }
  });

  it('computes the summary from the same visible rows with integer cents', async () => {
    const user = await seedUser('summary@example.com');

    await seedAccount(user, {name: 'Efectivo', currentBalance: 150000, isRoot: true});
    await seedAccount(user, {
      name: 'Débito',
      type: AccountTypeEnum.DEBIT.toString(),
      currentBalance: 250000,
    });
    await seedAccount(user, {
      name: 'Crédito',
      type: AccountTypeEnum.CREDIT.toString(),
      currentBalance: -120000,
    });
    await seedAccount(user, {
      name: 'Ahorros',
      type: AccountTypeEnum.SAVINGS.toString(),
      currentBalance: 500000,
      includeInTotal: false,
    });

    const {summary} = await service.list(user.publicId);

    expect(summary.totalBalance).toBe(780000);
    expect(summary.availableBalance).toBe(400000);
    expect(summary.liabilitiesBalance).toBe(120000);
    expect(summary.typeSummaries).toEqual([
      {type: AccountTypeEnum.CASH.toString(), count: 1, total: 150000},
      {type: AccountTypeEnum.DEBIT.toString(), count: 1, total: 250000},
      {type: AccountTypeEnum.CREDIT.toString(), count: 1, total: -120000},
      {type: AccountTypeEnum.SAVINGS.toString(), count: 1, total: 500000},
    ]);
  });

  it('rejects a deleted user with 404 NOT_FOUND', async () => {
    const user = await seedUser('deleted@example.com', '2026-11-20T10:00:00.000Z');

    await expect(service.list(user.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('persists a non-root account with seeded balance and allows duplicate names', async () => {
    const user = await seedUser('create@example.com');

    const created = await service.create(user.publicId, CREATE_REQUEST);
    const duplicate = await service.create(user.publicId, CREATE_REQUEST);
    const rows = await dataSource.getRepository(AccountEntity).find({where: {userId: user.id}});

    expect(created).toMatchObject({
      name: CREATE_REQUEST.name,
      type: CREATE_REQUEST.type,
      currentBalance: 500000,
      includeInTotal: true,
      targetGoal: 1000000,
      pinToHome: false,
      isRoot: false,
      version: 0,
    });
    expect(Object.keys(created)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
    expect(duplicate.publicId).not.toBe(created.publicId);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.isRoot === false && row.rootKey === null)).toBe(true);
    expect(rows[0]).toMatchObject({
      initialBalance: 500000,
      currentBalance: 500000,
      version: 0,
      deletedAt: null,
    });
  });

  it('persists a negative credit balance in integer cents', async () => {
    const user = await seedUser('credit@example.com');
    const request = {
      ...CREATE_REQUEST,
      type: AccountTypeEnum.CREDIT.toString(),
      initialBalance: -120000,
      targetGoal: null,
      creditLimit: 500000,
    };

    const created = await service.create(user.publicId, request);
    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: created.publicId}});

    expect(created.currentBalance).toBe(-120000);
    expect(stored).toMatchObject({
      initialBalance: -120000,
      currentBalance: -120000,
      creditLimit: 500000,
      isRoot: false,
    });
  });

  it('rejects a negative non-credit balance without writing a row', async () => {
    const user = await seedUser('negative@example.com');

    await expect(
      service.create(user.publicId, {...CREATE_REQUEST, initialBalance: -1}),
    ).rejects.toMatchObject({
      status: 400,
      code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
    });
    expect(await dataSource.getRepository(AccountEntity).count({where: {userId: user.id}})).toBe(0);
  });

  it('rejects account creation for a deleted user', async () => {
    const user = await seedUser('deleted-create@example.com', '2026-11-20T10:00:00.000Z');

    await expect(service.create(user.publicId, CREATE_REQUEST)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('returns a detail only for an active account owned by the caller', async () => {
    const user = await seedUser('detail@example.com');
    const otherUser = await seedUser('detail-other@example.com');
    const own = await seedAccount(user, {name: 'Efectivo', currentBalance: 150000});
    const foreign = await seedAccount(otherUser, {name: 'Externa'});
    const deleted = await seedAccount(user, {
      name: 'Borrada',
      deletedAt: '2026-11-20T10:00:00.000Z',
    });

    const detail = await service.findOne(user.publicId, own.publicId);

    expect(detail).toMatchObject({publicId: own.publicId, currentBalance: 150000, version: 0});
    expect(Object.keys(detail)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
    await expect(service.findOne(user.publicId, foreign.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    await expect(service.findOne(user.publicId, deleted.publicId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('persists mutable metadata and increments version atomically', async () => {
    const user = await seedUser('update@example.com');
    const account = await seedAccount(user, {
      name: 'Efectivo',
      type: AccountTypeEnum.SAVINGS.toString(),
      currentBalance: 150000,
    });

    const updated = await service.update(user.publicId, account.publicId, {
      name: 'Ahorros actualizados',
      includeInTotal: false,
      targetGoal: 900000,
      color: '#112233',
      icon: 'wallet',
      pinToHome: true,
      note: 'Actualizada',
      version: 0,
    });
    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: account.publicId}});

    expect(updated).toMatchObject({
      name: 'Ahorros actualizados',
      includeInTotal: false,
      targetGoal: 900000,
      color: '#112233',
      icon: 'wallet',
      pinToHome: true,
      note: 'Actualizada',
      version: 1,
    });
    expect(Object.keys(updated)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
    expect(stored).toMatchObject({
      name: 'Ahorros actualizados',
      initialBalance: 0,
      currentBalance: 150000,
      version: 1,
      deletedAt: null,
    });
  });

  it('rejects a stale version without writing', async () => {
    const user = await seedUser('stale@example.com');
    const account = await seedAccount(user, {version: 2});

    await expect(
      service.update(user.publicId, account.publicId, {name: 'Otro nombre', version: 1}),
    ).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      details: {expectedVersion: 1, currentVersion: 2},
    });

    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: account.publicId}});
    expect(stored).toMatchObject({name: 'Efectivo', version: 2});
  });

  it('rejects a CREDIT to non-CREDIT change while the balance is negative', async () => {
    const user = await seedUser('credit-update@example.com');
    const account = await seedAccount(user, {
      type: AccountTypeEnum.CREDIT.toString(),
      currentBalance: -120000,
    });

    await expect(
      service.update(user.publicId, account.publicId, {
        type: AccountTypeEnum.CASH.toString(),
        version: 0,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
    });

    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: account.publicId}});
    expect(stored).toMatchObject({type: AccountTypeEnum.CREDIT.toString(), version: 0});
  });

  it('rejects a non-null credit limit when the effective type is non-credit', async () => {
    const user = await seedUser('credit-limit@example.com');
    const account = await seedAccount(user, {type: AccountTypeEnum.CASH.toString()});

    await expect(
      service.update(user.publicId, account.publicId, {creditLimit: 100000, version: 0}),
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {creditLimit: expect.any(String)}},
    });

    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: account.publicId}});
    expect(stored).toMatchObject({creditLimit: null, version: 0});
  });

  it('persists explicit pin and unpin, incrementing version without touching balances', async () => {
    const user = await seedUser('pin@example.com');
    const root = await seedAccount(user, {name: 'Efectivo', isRoot: true, pinToHome: true});
    const savings = await seedAccount(user, {
      name: 'Ahorros',
      type: AccountTypeEnum.SAVINGS.toString(),
      currentBalance: 500000,
    });

    const pinned = await service.setPin(user.publicId, savings.publicId, {
      pinToHome: true,
      version: 0,
    });
    const unpinned = await service.setPin(user.publicId, root.publicId, {
      pinToHome: false,
      version: 0,
    });
    const again = await service.setPin(user.publicId, savings.publicId, {pinToHome: true});
    const {items} = await service.list(user.publicId);
    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: savings.publicId}});

    expect(pinned).toMatchObject({pinToHome: true, version: 1});
    expect(unpinned).toMatchObject({pinToHome: false, isRoot: true, version: 1});
    expect(again).toMatchObject({pinToHome: true, version: 2});
    expect(items.map((item) => item.name)).toEqual(['Ahorros', 'Efectivo']);
    expect(stored).toMatchObject({
      pinToHome: true,
      initialBalance: 0,
      currentBalance: 500000,
      version: 2,
      deletedAt: null,
    });
    expect(Object.keys(pinned)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
  });

  it('rejects a stale version on pinning without writing', async () => {
    const user = await seedUser('pin-stale@example.com');
    const account = await seedAccount(user, {version: 2, pinToHome: false});

    await expect(
      service.setPin(user.publicId, account.publicId, {pinToHome: true, version: 1}),
    ).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      details: {expectedVersion: 1, currentVersion: 2},
    });

    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: account.publicId}});
    expect(stored).toMatchObject({pinToHome: false, version: 2});
  });

  it('returns 404 when pinning a foreign, soft-deleted or unknown account', async () => {
    const user = await seedUser('pin-owner@example.com');
    const otherUser = await seedUser('pin-other@example.com');
    const foreign = await seedAccount(otherUser);
    const deleted = await seedAccount(user, {
      deletedAt: '2026-11-20T10:00:00.000Z',
    });

    await expect(
      service.setPin(user.publicId, foreign.publicId, {pinToHome: true}),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
    await expect(
      service.setPin(user.publicId, deleted.publicId, {pinToHome: true}),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
    await expect(
      service.setPin(user.publicId, 'unknown-public-id', {pinToHome: true}),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
  });

  it('soft-deletes a zero-balance account without requiring a destination', async () => {
    const user = await seedUser('delete-zero@example.com');
    const source = await seedAccount(user, {currentBalance: 0, version: 2});

    const result = await service.remove(user.publicId, source.publicId);

    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: source.publicId}});
    expect(result).toMatchObject({
      deletedAccountPublicId: source.publicId,
      transferMovement: null,
      balances: [{accountPublicId: source.publicId, currentBalance: 0, version: 3}],
    });
    expect(stored).toMatchObject({currentBalance: 0, version: 3});
    expect(stored?.deletedAt).toEqual(expect.any(String));
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('transfers a positive balance atomically and writes a single global TRANSFER category', async () => {
    const user = await seedUser('delete-transfer@example.com');
    const source = await seedAccount(user, {name: 'Ahorros', currentBalance: 50000, version: 1});
    const destination = await seedAccount(user, {
      name: 'Efectivo',
      currentBalance: 200000,
      version: 4,
    });

    const result = await service.remove(user.publicId, source.publicId, destination.publicId);

    const sourceRow = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: source.publicId}});
    const destinationRow = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: destination.publicId}});
    const movement = await dataSource.getRepository(MovementEntity).findOne({
      where: {publicId: result.transferMovement?.publicId ?? ''},
      relations: {account: true, targetAccount: true, category: true},
    });
    const categories = await dataSource.getRepository(CategoryEntity).find({
      where: {name: 'transfer'},
    });

    expect(sourceRow).toMatchObject({currentBalance: 0, version: 2});
    expect(sourceRow?.deletedAt).toEqual(expect.any(String));
    expect(destinationRow).toMatchObject({currentBalance: 250000, version: 5});
    expect(movement).toMatchObject({
      type: 'TRANSFER',
      amount: 50000,
      isReversal: false,
      isReversed: false,
      isCanceled: false,
      account: {publicId: source.publicId},
      targetAccount: {publicId: destination.publicId},
      category: {name: 'transfer', applyType: 'TRANSFER', isSystem: true},
    });
    expect(movement?.publicId).not.toBe(source.id.toString());
    expect(categories).toHaveLength(1);
    expect(result.balances).toEqual([
      {accountPublicId: source.publicId, currentBalance: 0, version: 2},
      {accountPublicId: destination.publicId, currentBalance: 250000, version: 5},
    ]);

    const secondSource = await seedAccount(user, {currentBalance: 10000});
    await service.remove(user.publicId, secondSource.publicId, destination.publicId);
    expect(await dataSource.getRepository(CategoryEntity).count({where: {name: 'transfer'}})).toBe(
      1,
    );
  });

  it('absorbs a negative balance into a CREDIT destination with a positive movement magnitude', async () => {
    const user = await seedUser('delete-negative@example.com');
    const source = await seedAccount(user, {currentBalance: -30000, version: 1});
    const destination = await seedAccount(user, {
      type: AccountTypeEnum.CREDIT.toString(),
      currentBalance: 200000,
      creditLimit: 500000,
    });

    const result = await service.remove(user.publicId, source.publicId, destination.publicId);
    const movement = await dataSource.getRepository(MovementEntity).findOne({
      where: {publicId: result.transferMovement?.publicId ?? ''},
      relations: {account: true, targetAccount: true},
    });

    expect(movement).toMatchObject({
      type: 'TRANSFER',
      amount: 30000,
      account: {publicId: destination.publicId},
      targetAccount: {publicId: source.publicId},
    });
    const destinationRow = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: destination.publicId}});
    expect(destinationRow?.currentBalance).toBe(170000);
  });

  it('rejects a negative balance transfer into a non-credit destination without writing', async () => {
    const user = await seedUser('delete-negative-blocked@example.com');
    const source = await seedAccount(user, {currentBalance: -30000});
    const destination = await seedAccount(user, {currentBalance: 10000});

    await expect(
      service.remove(user.publicId, source.publicId, destination.publicId),
    ).rejects.toMatchObject({status: 409, code: 'NEGATIVE_BALANCE_NOT_ALLOWED'});
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
    expect(
      await dataSource.getRepository(AccountEntity).count({where: {deletedAt: IsNull()}}),
    ).toBe(2);
  });

  it('protects the root account and rejects missing, self and foreign destinations', async () => {
    const user = await seedUser('delete-guards@example.com');
    const otherUser = await seedUser('delete-guards-other@example.com');
    const root = await seedAccount(user, {isRoot: true, currentBalance: 0});
    const source = await seedAccount(user, {currentBalance: 10000});
    const foreign = await seedAccount(otherUser, {currentBalance: 0});

    await expect(service.remove(user.publicId, root.publicId)).rejects.toMatchObject({
      status: 409,
      code: 'ROOT_ACCOUNT_PROTECTED',
    });
    await expect(service.remove(user.publicId, source.publicId)).rejects.toMatchObject({
      status: 409,
      code: 'TRANSFER_REQUIRED',
    });
    await expect(
      service.remove(user.publicId, source.publicId, source.publicId),
    ).rejects.toMatchObject({status: 422, code: 'UNPROCESSABLE_ENTITY'});
    await expect(
      service.remove(user.publicId, source.publicId, foreign.publicId),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
    await expect(service.remove(user.publicId, 'unknown-id')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(await dataSource.getRepository(MovementEntity).count()).toBe(0);
  });

  it('blocks deletion when the current UTC month already has a snapshot', async () => {
    const user = await seedUser('delete-closed@example.com');
    const source = await seedAccount(user, {currentBalance: 0});
    const period = new Date().toISOString().slice(0, 7);
    await dataSource.getRepository(PeriodSnapshotEntity).save(
      dataSource.getRepository(PeriodSnapshotEntity).create({
        userId: user.id,
        period,
        startDate: `${period}-01`,
        endDate: `${period}-28`,
        globalInitialBalance: 0,
        globalFinalBalance: 0,
        totalInflows: 0,
        totalOutflows: 0,
        totalTransfers: 0,
        totalTransactionsCount: 0,
      }),
    );

    await expect(service.remove(user.publicId, source.publicId)).rejects.toMatchObject({
      status: 409,
      code: 'PERIOD_CLOSED',
    });
    const stored = await dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: source.publicId}});
    expect(stored?.deletedAt).toBeNull();
  });
});

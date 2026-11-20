import {AccountTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {createTypeOrmOptions} from '../database/database.config';
import {AccountEntity, UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {AccountsService} from './accounts.service';
import {AccountRepository} from './services/account.repository';

jest.setTimeout(180_000);

describe('account listing flow (MySQL 8, US-301)', () => {
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

    service = new AccountsService(
      new UserProfileRepository(dataSource),
      new AccountRepository(dataSource),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM accounts');
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
});

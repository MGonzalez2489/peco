import {CategoryApplyTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {createTypeOrmOptions} from '../database/database.config';
import {CategoryEntity, UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {CategoriesService} from './categories.service';
import {CategoryRepository} from './services/category.repository';

jest.setTimeout(180_000);

describe('category catalog (MySQL 8, US-401)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: CategoriesService;

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

  const seedCategory = async (
    user: UserEntity | null,
    overrides: Partial<CategoryEntity> = {},
  ): Promise<CategoryEntity> =>
    dataSource.getRepository(CategoryEntity).save(
      dataSource.getRepository(CategoryEntity).create({
        userId: user?.id ?? null,
        name: 'cafe',
        displayName: 'Café',
        icon: 'coffee',
        color: '#F97316',
        applyType: CategoryApplyTypeEnum.BOTH.toString(),
        isRoot: false,
        isSystem: false,
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

    service = new CategoriesService(
      new UserProfileRepository(dataSource),
      new CategoryRepository(dataSource),
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
    await service.onModuleInit();
  });

  it('returns global rows plus only the caller\'s active rows', async () => {
    const user = await seedUser('user@example.com');
    const otherUser = await seedUser('other@example.com');

    await seedCategory(null, {
      name: 'transfer',
      displayName: 'Transferencia',
      applyType: CategoryApplyTypeEnum.TRANSFER.toString(),
      isSystem: true,
    });
    await seedCategory(user, {name: 'cafe', displayName: 'Café'});
    await seedCategory(user, {
      name: 'borrada',
      displayName: 'Borrada',
      deletedAt: '2026-11-21T10:00:00.000Z',
    });
    await seedCategory(otherUser, {name: 'ajena', displayName: 'Ajena'});

    const items = await service.list(user.publicId);

    expect(items.map((item) => item.name).sort()).toEqual(['cafe', 'transfer', 'unknown']);
  });

  it('exposes the normalized name and the user-facing displayName separately', async () => {
    const user = await seedUser('names@example.com');
    await seedCategory(user, {name: 'cafe-con-leche', displayName: 'Café con Leche'});

    const items = await service.list(user.publicId);
    const category = items.find((item) => item.name === 'cafe-con-leche');

    expect(category).toBeDefined();
    expect(category).toMatchObject({
      name: 'cafe-con-leche',
      displayName: 'Café con Leche',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
    });
    expect(Object.keys(category ?? {})).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'ownerKey', 'activeName', 'deletedAt']),
    );
  });

  it('keeps exactly one root category after repeated bootstrap and lists it first', async () => {
    const user = await seedUser('root@example.com');
    await service.onModuleInit();

    const items = await service.list(user.publicId);
    const roots = items.filter((item) => item.isRoot);

    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({
      name: 'unknown',
      displayName: 'Otros',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
    });
    expect(items[0].isRoot).toBe(true);
  });

  it('rejects a deleted caller', async () => {
    const user = await seedUser('deleted@example.com', '2026-11-21T10:00:00.000Z');

    await expect(service.list(user.publicId)).rejects.toMatchObject({code: 'NOT_FOUND'});
  });
});

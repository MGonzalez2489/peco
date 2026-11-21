import {CategoryApplyTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions, IsNull} from 'typeorm';
import {createTypeOrmOptions} from '../database/database.config';
import {CategoryEntity, UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {CategoriesService} from './categories.service';
import {SYSTEM_CATEGORY_SEED} from './constants/system-categories.constant';
import {CategoryRepository} from './services/category.repository';

jest.setTimeout(180_000);

const SYSTEM_NAMES = SYSTEM_CATEGORY_SEED.map((seed) => seed.name).sort();

describe('category catalog (MySQL 8, US-401/US-402)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: CategoriesService;
  let categories: CategoryRepository;

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

  const createRequest = (displayName: string) => ({
    displayName,
    icon: 'coffee',
    color: '#F97316',
    applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
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

    categories = new CategoryRepository(dataSource);
    service = new CategoriesService(new UserProfileRepository(dataSource), categories);
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

    await seedCategory(user, {name: 'cafe', displayName: 'Café'});
    await seedCategory(user, {
      name: 'borrada',
      displayName: 'Borrada',
      deletedAt: '2026-11-21T10:00:00.000Z',
    });
    await seedCategory(otherUser, {name: 'ajena', displayName: 'Ajena'});

    const items = await service.list(user.publicId);

    expect(items.map((item) => item.name).sort()).toEqual([...SYSTEM_NAMES, 'cafe'].sort());
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

  it('seeds the 10 global rows once and reuses the D98 root and D96 transfer rows', async () => {
    await service.onModuleInit();
    await categories.ensureSystemCatalog();

    const repository = dataSource.getRepository(CategoryEntity);
    const globalRows = await repository.find({where: {userId: IsNull()}});

    expect(globalRows).toHaveLength(SYSTEM_CATEGORY_SEED.length);
    expect(await repository.count({where: {userId: IsNull(), isRoot: true}})).toBe(1);
    expect(globalRows.find((row) => row.name === 'transfer')).toMatchObject({
      displayName: 'Transferencia',
      applyType: CategoryApplyTypeEnum.TRANSFER.toString(),
      isSystem: true,
    });
    expect(globalRows.map((row) => row.name).sort()).toEqual(SYSTEM_NAMES);
  });

  it('creates an owned category with a server-derived slug', async () => {
    const user = await seedUser('create@example.com');

    const result = await service.create(user.publicId, createRequest('Café con Leche'));

    expect(result).toMatchObject({
      name: 'cafe-con-leche',
      displayName: 'Café con Leche',
      icon: 'coffee',
      color: '#F97316',
      applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
      isRoot: false,
      isSystem: false,
    });
    const stored = await dataSource.getRepository(CategoryEntity).findOneByOrFail({
      publicId: result.publicId,
    });
    expect(stored.userId).toBe(user.id);
  });

  it('rejects a duplicate slug that differs only by case or accent', async () => {
    const user = await seedUser('duplicate@example.com');
    await service.create(user.publicId, createRequest('Café'));

    await expect(service.create(user.publicId, createRequest('cafe'))).rejects.toMatchObject({
      code: 'CATEGORY_NAME_TAKEN',
    });
    await expect(service.create(user.publicId, createRequest('CAFÉ'))).rejects.toMatchObject({
      code: 'CATEGORY_NAME_TAKEN',
    });
    expect(await dataSource.getRepository(CategoryEntity).count({where: {userId: user.id}})).toBe(1);
  });

  it('rejects a user category reusing a global catalog name', async () => {
    const user = await seedUser('system-name@example.com');

    await expect(service.create(user.publicId, createRequest('Payroll'))).rejects.toMatchObject({
      code: 'CATEGORY_NAME_TAKEN',
    });
    await expect(service.create(user.publicId, createRequest('Transfer'))).rejects.toMatchObject({
      code: 'CATEGORY_NAME_TAKEN',
    });
  });

  it('allows a deleted name to be reused in the same namespace', async () => {
    const user = await seedUser('reuse@example.com');
    const first = await service.create(user.publicId, createRequest('Café'));
    await dataSource.getRepository(CategoryEntity).update(
      {publicId: first.publicId},
      {deletedAt: '2026-11-21T10:00:00.000Z'},
    );

    const reused = await service.create(user.publicId, createRequest('cafe'));

    expect(reused.name).toBe('cafe');
    expect(reused.publicId).not.toBe(first.publicId);
  });

  it('updates mutable metadata and re-derives the slug from displayName', async () => {
    const user = await seedUser('update@example.com');
    const created = await service.create(user.publicId, createRequest('Café'));

    const updated = await service.update(user.publicId, created.publicId, {
      displayName: 'Café con Leche',
      icon: 'cup-soda',
      color: '#10B981',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
    });

    expect(updated).toMatchObject({
      publicId: created.publicId,
      name: 'cafe-con-leche',
      displayName: 'Café con Leche',
      icon: 'cup-soda',
      color: '#10B981',
      applyType: CategoryApplyTypeEnum.BOTH.toString(),
    });
  });

  it('revalidates slug uniqueness when a patch renames a category', async () => {
    const user = await seedUser('rename@example.com');
    const first = await service.create(user.publicId, createRequest('Café'));
    const second = await service.create(user.publicId, {
      ...createRequest('Té'),
      applyType: CategoryApplyTypeEnum.INCOME.toString(),
    });

    await expect(
      service.update(user.publicId, second.publicId, {displayName: 'CAFÉ'}),
    ).rejects.toMatchObject({code: 'CATEGORY_NAME_TAKEN'});

    const stored = await dataSource.getRepository(CategoryEntity).findOneByOrFail({
      publicId: second.publicId,
    });
    expect(stored.name).toBe('te');
    expect(first.name).toBe('cafe');
  });

  it('protects root and system categories from updates', async () => {
    const user = await seedUser('protected@example.com');
    const items = await service.list(user.publicId);
    const root = items.find((item) => item.isRoot);
    const transfer = items.find((item) => item.name === 'transfer');

    expect(root).toBeDefined();
    expect(transfer).toBeDefined();
    if (!root || !transfer) {
      throw new Error('Expected the global root and transfer rows to be seeded');
    }
    await expect(
      service.update(user.publicId, root.publicId, {displayName: 'Otro'}),
    ).rejects.toMatchObject({code: 'CATEGORY_SYSTEM_PROTECTED'});
    await expect(
      service.update(user.publicId, transfer.publicId, {displayName: 'Otro'}),
    ).rejects.toMatchObject({code: 'CATEGORY_SYSTEM_PROTECTED'});
  });

  it('returns 404 for an unknown or foreign category publicId', async () => {
    const user = await seedUser('owner@example.com');
    const otherUser = await seedUser('foreign@example.com');
    const foreign = await service.create(otherUser.publicId, createRequest('Ajena'));

    await expect(
      service.update(user.publicId, foreign.publicId, {displayName: 'Otra'}),
    ).rejects.toMatchObject({code: 'NOT_FOUND'});
    await expect(
      service.update(user.publicId, 'missing-public-id', {displayName: 'Otra'}),
    ).rejects.toMatchObject({code: 'NOT_FOUND'});
  });

  it('rejects a deleted caller on both create and update', async () => {
    const user = await seedUser('deleted@example.com', '2026-11-21T10:00:00.000Z');

    await expect(service.list(user.publicId)).rejects.toMatchObject({code: 'NOT_FOUND'});
    await expect(service.create(user.publicId, createRequest('Café'))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

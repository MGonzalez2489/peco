import {AppThemeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {createTypeOrmOptions} from '../database/database.config';
import {UserEntity, UserPreferencesEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {PreferencesRepository} from './services/preferences.repository';
import {PreferencesService} from './services/preferences.service';

jest.setTimeout(180_000);

const DELETED_AT = '2026-11-25T12:00:00.000Z';
const DISMISSED_AT = '2026-11-20T09:30:00.000Z';
const LIGHT = AppThemeEnum.LIGHT.toString();
const DARK = AppThemeEnum.DARK.toString();
const SYSTEM = AppThemeEnum.SYSTEM.toString();

type SeedPreferences = Partial<
  Pick<
    UserPreferencesEntity,
    'theme' | 'pwaBannerDismissedAt' | 'hideBalance' | 'hideReversal'
  >
>;

describe('preferences persistence (MySQL 8, US-901)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: PreferencesService;

  const seedUser = async (email: string, preferences?: SeedPreferences): Promise<UserEntity> => {
    const users = dataSource.getRepository(UserEntity);
    const user = await users.save(
      users.create({email, passwordHash: 'hash', name: 'Usuario', lastActiveAt: null, deletedAt: null}),
    );

    if (preferences) {
      const repository = dataSource.getRepository(UserPreferencesEntity);
      await repository.save(
        repository.create({
          userId: user.id,
          theme: SYSTEM,
          pwaBannerDismissedAt: null,
          hideBalance: false,
          hideReversal: false,
          deletedAt: null,
          ...preferences,
        }),
      );
    }

    return user;
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

    service = new PreferencesService(
      new UserProfileRepository(dataSource),
      new PreferencesRepository(dataSource),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM userPreferences');
    await dataSource.query('DELETE FROM users');
  });

  it('returns the documented defaults without creating a row on GET', async () => {
    const user = await seedUser('without-preferences@example.com');

    await expect(service.find(user.publicId)).resolves.toEqual({
      theme: LIGHT,
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: false},
      movements: {hideReversal: true},
      updatedAt: null,
    });
    expect(await dataSource.getRepository(UserPreferencesEntity).count()).toBe(0);
  });

  it('creates a missing row with defaults plus the valid patch', async () => {
    const user = await seedUser('new-preferences@example.com');

    const result = await service.update(user.publicId, {
      theme: DARK,
      accounts: {hideBalance: true},
    });

    expect(result).toMatchObject({
      theme: DARK,
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: true},
      movements: {hideReversal: true},
    });
    expect(result.updatedAt).toEqual(expect.any(String));

    const row = await dataSource
      .getRepository(UserPreferencesEntity)
      .findOneByOrFail({userId: user.id});
    expect(row).toMatchObject({
      theme: DARK,
      pwaBannerDismissedAt: null,
      hideBalance: true,
      hideReversal: true,
      deletedAt: null,
    });
  });

  it('merges only the sent sections and can clear the PWA timestamp', async () => {
    const user = await seedUser('existing-preferences@example.com', {
      theme: SYSTEM,
      pwaBannerDismissedAt: DISMISSED_AT,
      hideBalance: false,
      hideReversal: false,
    });

    const result = await service.update(user.publicId, {
      pwaBannerDismissedAt: null,
      movements: {hideReversal: true},
    });

    expect(result).toMatchObject({
      theme: SYSTEM,
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: false},
      movements: {hideReversal: true},
    });

    const row = await dataSource
      .getRepository(UserPreferencesEntity)
      .findOneByOrFail({userId: user.id});
    expect(row).toMatchObject({
      theme: SYSTEM,
      pwaBannerDismissedAt: null,
      hideBalance: false,
      hideReversal: true,
    });
  });

  it('never writes another user\'s preferences', async () => {
    const owner = await seedUser('owner@example.com', {theme: SYSTEM});
    const other = await seedUser('other@example.com', {theme: LIGHT});

    await service.update(owner.publicId, {theme: DARK});

    const repository = dataSource.getRepository(UserPreferencesEntity);
    expect((await repository.findOneByOrFail({userId: owner.id})).theme).toBe(DARK);
    expect((await repository.findOneByOrFail({userId: other.id})).theme).toBe(LIGHT);
  });

  it('returns 404 NOT_FOUND for a deleted caller', async () => {
    const user = await seedUser('deleted@example.com', {theme: SYSTEM});
    await dataSource.getRepository(UserEntity).update({id: user.id}, {deletedAt: DELETED_AT});

    await expect(service.find(user.publicId)).rejects.toMatchObject({code: 'NOT_FOUND'});
    await expect(service.update(user.publicId, {theme: DARK})).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

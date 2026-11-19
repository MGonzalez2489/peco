import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {AuthRegistrationRepository} from '../auth/services/auth-registration.repository';
import {PasswordHasher} from '../auth/services/password-hasher';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AuditLogEntity,
  RefreshTokenEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../database/entities';
import {ANONYMIZED_PASSWORD_HASH} from './constants/anonymized-password-hash.constant';
import {ANONYMIZED_USER_NAME} from './constants/anonymized-user-name.constant';
import {USER_AUDIT_ENTITY} from './constants/user-audit-entity.constant';
import {USER_DELETE_AUDIT_ACTION} from './constants/user-delete-audit-action.constant';
import {UserDeletionRepository} from './services/user-deletion.repository';
import {UserProfileRepository} from './services/user-profile.repository';
import {UsersService} from './users.service';

jest.setTimeout(180_000);

const DELETION_AT = '2026-11-19T18:45:00.000Z';
const PASSWORD = 'correct horse battery';

describe('user profile and deletion flows (MySQL 8, US-207/D87)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: UsersService;
  let hasher: PasswordHasher;
  const clock = {now: () => DELETION_AT} as unknown as UtcClock;

  const seedUser = async (email: string, name: string): Promise<UserEntity> => {
    const user = await dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: await hasher.hash(PASSWORD),
        name,
        lastActiveAt: null,
        deletedAt: null,
      }),
    );
    await dataSource.getRepository(UserPreferencesEntity).save(
      dataSource.getRepository(UserPreferencesEntity).create({
        userId: user.id,
        theme: 'system',
        pwaBannerDismissedAt: null,
        hideBalance: false,
        hideReversal: false,
        deletedAt: null,
      }),
    );
    await dataSource.getRepository(RefreshTokenEntity).save(
      dataSource.getRepository(RefreshTokenEntity).create({
        userId: user.id,
        tokenHash: `hash-${user.publicId}`,
        expiresAt: '2026-12-01T00:00:00.000Z',
        revokedAt: null,
      }),
    );
    return user;
  };

  const storedUser = (id: number): Promise<UserEntity | null> =>
    dataSource.getRepository(UserEntity).createQueryBuilder().where('id = :id', {id}).getOne();

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

    hasher = new PasswordHasher();
    service = new UsersService(
      new UserProfileRepository(dataSource),
      new UserDeletionRepository(dataSource, clock),
      hasher,
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM auditLogs');
    await dataSource.query('DELETE FROM refreshTokens');
    await dataSource.query('DELETE FROM userPreferences');
    await dataSource.query('DELETE FROM accounts');
    await dataSource.query('DELETE FROM users');
  });

  it('updates the name and returns a public response', async () => {
    const user = await seedUser('user@example.com', 'Manuel');

    const response = await service.update(user.publicId, {name: 'Ana'});

    expect(response).toEqual({
      publicId: user.publicId,
      email: user.email,
      name: 'Ana',
      createdAt: user.createdAt,
      updatedAt: expect.any(String),
    });
    expect(Object.keys(response)).not.toContain('id');
    expect((await storedUser(user.id))?.name).toBe('Ana');
  });

  it('returns the unchanged profile when no name is supplied', async () => {
    const user = await seedUser('user@example.com', 'Manuel');

    const response = await service.update(user.publicId, {});

    expect(response.name).toBe('Manuel');
    expect((await storedUser(user.id))?.name).toBe('Manuel');
  });

  it('returns 404 for a soft-deleted user', async () => {
    const user = await seedUser('user@example.com', 'Manuel');
    await service.remove(user.publicId, {password: PASSWORD});

    await expect(service.update(user.publicId, {name: 'Ana'})).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('rejects a wrong password without changing or logging anything', async () => {
    const user = await seedUser('user@example.com', 'Manuel');

    await expect(service.remove(user.publicId, {password: 'wrong-password'})).rejects.toMatchObject(
      {status: 401, code: 'INVALID_CREDENTIALS'},
    );

    const stored = await storedUser(user.id);
    expect(stored).toMatchObject({name: 'Manuel', deletedAt: null});
    expect(stored?.passwordHash).toBe(user.passwordHash);
    expect(
      await dataSource.getRepository(RefreshTokenEntity).findOneByOrFail({userId: user.id}),
    ).toMatchObject({revokedAt: null});
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('soft deletes, anonymizes, revokes, reserves the email and writes an audit row', async () => {
    const user = await seedUser('user@example.com', 'Manuel');

    await service.remove(user.publicId, {password: PASSWORD});

    const stored = await storedUser(user.id);
    expect(stored).toMatchObject({
      email: 'user@example.com',
      name: ANONYMIZED_USER_NAME,
      passwordHash: ANONYMIZED_PASSWORD_HASH,
      deletedAt: DELETION_AT,
    });
    expect(
      await dataSource.getRepository(RefreshTokenEntity).findOneByOrFail({userId: user.id}),
    ).toMatchObject({revokedAt: DELETION_AT});
    expect(
      await dataSource.getRepository(UserPreferencesEntity).findOneByOrFail({userId: user.id}),
    ).toMatchObject({deletedAt: DELETION_AT});

    const audit = await dataSource.getRepository(AuditLogEntity).findOneByOrFail({userId: user.id});
    expect(audit).toMatchObject({
      entity: USER_AUDIT_ENTITY,
      entityId: user.publicId,
      action: USER_DELETE_AUDIT_ACTION,
      before: {deletedAt: null},
      after: {deletedAt: DELETION_AT, name: ANONYMIZED_USER_NAME},
    });
    expect(JSON.stringify(audit.before) + JSON.stringify(audit.after)).not.toContain(
      'user@example.com',
    );
    expect(JSON.stringify(audit.before) + JSON.stringify(audit.after)).not.toContain(
      'passwordHash',
    );
  });

  it('returns 404 on the second deletion', async () => {
    const user = await seedUser('user@example.com', 'Manuel');
    await service.remove(user.publicId, {password: PASSWORD});

    await expect(service.remove(user.publicId, {password: PASSWORD})).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(1);
  });

  it('keeps the email reserved after deletion', async () => {
    const user = await seedUser('user@example.com', 'Manuel');
    await service.remove(user.publicId, {password: PASSWORD});

    const registration = new AuthRegistrationRepository(dataSource);
    await expect(
      registration.create({
        email: user.email,
        passwordHash: await hasher.hash('another-password'),
        name: 'Otro usuario',
        refreshTokenHash: 'fresh-hash',
        refreshExpiresAt: '2026-12-01T00:00:00.000Z',
      }),
    ).rejects.toMatchObject({status: 409, code: 'EMAIL_ALREADY_REGISTERED'});
    expect(await dataSource.getRepository(UserEntity).count()).toBe(1);
  });

  it('leaves other users untouched', async () => {
    const first = await seedUser('first@example.com', 'Manuel');
    const second = await seedUser('second@example.com', 'Ana');

    await service.remove(first.publicId, {password: PASSWORD});

    expect(await storedUser(second.id)).toMatchObject({name: 'Ana', deletedAt: null});
    expect(
      await dataSource.getRepository(RefreshTokenEntity).findOneByOrFail({userId: second.id}),
    ).toMatchObject({revokedAt: null});
    expect(
      await dataSource.getRepository(UserPreferencesEntity).findOneByOrFail({userId: second.id}),
    ).toMatchObject({deletedAt: null});
    expect((await service.update(second.publicId, {name: 'Ana Maria'})).name).toBe('Ana Maria');
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(1);
  });
});

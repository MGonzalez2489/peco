import {createHash} from 'node:crypto';
import {JwtService} from '@nestjs/jwt';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import type {ConfigService} from '../config/config.service';
import {createTypeOrmOptions} from '../database/database.config';
import {UtcClock} from '../database/clock/utc-clock';
import {AccountEntity, RefreshTokenEntity, UserEntity} from '../database/entities';
import {AuthService} from './auth.service';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {TokenService} from './services/token-service';

jest.setTimeout(180_000);

const ACCESS_SECRET = 'integration-access-secret-at-least-32-chars';
const VALID_REGISTRATION = {
  email: 'user@example.com',
  password: 'correct horse battery',
  name: 'Manuel',
};

describe('registration transaction (MySQL 8, US-201)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: AuthService;
  let hasher: PasswordHasher;

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

    const configService = {
      config: {
        jwt: {accessSecret: ACCESS_SECRET, refreshSecret: 'integration-refresh-secret-32chars'},
        tokens: {access: '15m', refresh: '30m', reset: '45m'},
      },
    } as unknown as ConfigService;

    hasher = new PasswordHasher();
    service = new AuthService(
      new AuthRegistrationRepository(dataSource),
      hasher,
      new TokenService(new JwtService(), configService, new UtcClock()),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM refreshTokens');
    await dataSource.query('DELETE FROM accounts');
    await dataSource.query('DELETE FROM users');
  });

  it('persists the normalized user, root account and hashed refresh token', async () => {
    const response = await service.register({
      ...VALID_REGISTRATION,
      email: '  Manuel@Example.COM ',
    });

    const users = await dataSource.getRepository(UserEntity).find();
    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('manuel@example.com');
    expect(await hasher.verify(users[0].passwordHash, VALID_REGISTRATION.password)).toBe(true);

    const accounts = await dataSource.getRepository(AccountEntity).find();
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({
      userId: users[0].id,
      name: 'Efectivo',
      type: 'CASH',
      initialBalance: 0,
      currentBalance: 0,
      includeInTotal: true,
      pinToHome: true,
      isRoot: true,
      rootKey: users[0].id,
    });

    const refreshTokens = await dataSource.getRepository(RefreshTokenEntity).find();
    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0].userId).toBe(users[0].id);
    expect(refreshTokens[0].tokenHash).toBe(
      createHash('sha256').update(response.refreshToken).digest('hex'),
    );
    expect(refreshTokens[0].tokenHash).not.toBe(response.refreshToken);

    const payload = new JwtService().verify<{sub: string; id?: number}>(response.accessToken, {
      secret: ACCESS_SECRET,
    });
    expect(payload.sub).toBe(response.user.publicId);
    expect(payload.id).toBeUndefined();
    expect(Object.keys(response.user)).not.toContain('id');
    expect(response.expiresIn).toBe(900);
    expect(response.refreshExpiresIn).toBe(1800);
  });

  it('reserves the normalized email forever without duplicating rows', async () => {
    await service.register(VALID_REGISTRATION);

    const failure = await service
      .register({...VALID_REGISTRATION, email: '  USER@EXAMPLE.COM '})
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
      status: 409,
    });
    expect(await dataSource.getRepository(UserEntity).count()).toBe(1);
    expect(await dataSource.getRepository(AccountEntity).count()).toBe(1);
    expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(1);
  });

  it('rolls back the user and refresh token when the root account insert fails', async () => {
    await dataSource.query(
      'ALTER TABLE accounts ADD CONSTRAINT chk_accounts_no_root CHECK (isRoot = 0)',
    );

    try {
      const failure = await service
        .register({...VALID_REGISTRATION, email: 'rollback@example.com'})
        .catch((error: unknown) => error);

      expect(String(failure)).toContain('chk_accounts_no_root');
      expect(await dataSource.getRepository(UserEntity).count()).toBe(0);
      expect(await dataSource.getRepository(AccountEntity).count()).toBe(0);
      expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(0);
    } finally {
      await dataSource.query('ALTER TABLE accounts DROP CHECK chk_accounts_no_root');
    }
  });
});

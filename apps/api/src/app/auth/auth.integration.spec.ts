import {createHash} from 'node:crypto';
import {JwtService} from '@nestjs/jwt';
import {AccountTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import type {ConfigService} from '../config/config.service';
import {createTypeOrmOptions} from '../database/database.config';
import {UtcClock} from '../database/clock/utc-clock';
import {AccountEntity, RefreshTokenEntity, UserEntity} from '../database/entities';
import {AuthService} from './auth.service';
import {AuthLoginRepository} from './services/auth-login.repository';
import {AuthRefreshRepository} from './services/auth-refresh.repository';
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

describe('auth flows (MySQL 8, US-201/US-202/US-203)', () => {
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
      new AuthLoginRepository(dataSource),
      new AuthRefreshRepository(dataSource, new UtcClock()),
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
      type: AccountTypeEnum.CASH.toString(),
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

  describe('login (US-202)', () => {
    it('logs in with a normalized email and stores a fresh hashed refresh token', async () => {
      const registered = await service.register(VALID_REGISTRATION);

      const response = await service.login({
        email: '  USER@EXAMPLE.COM ',
        password: VALID_REGISTRATION.password,
      });

      expect(response.user).toEqual(registered.user);
      expect(response.expiresIn).toBe(900);
      expect(response.refreshExpiresIn).toBe(1800);

      const payload = new JwtService().verify<{sub: string; id?: number}>(response.accessToken, {
        secret: ACCESS_SECRET,
      });
      expect(payload.sub).toBe(response.user.publicId);
      expect(payload.id).toBeUndefined();

      const refreshTokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(refreshTokens).toHaveLength(2);
      expect(refreshTokens.map((token) => token.tokenHash)).toContain(
        createHash('sha256').update(response.refreshToken).digest('hex'),
      );
      expect(refreshTokens.every((token) => token.tokenHash !== response.refreshToken)).toBe(true);
      expect(await dataSource.getRepository(UserEntity).count()).toBe(1);
      expect(await dataSource.getRepository(AccountEntity).count()).toBe(1);
    });

    it('rejects an unknown email with the same 401 and without creating a session', async () => {
      await service.register(VALID_REGISTRATION);

      const failure = await service
        .login({email: 'missing@example.com', password: VALID_REGISTRATION.password})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
        userMessage: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
      expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(1);
    });

    it('rejects a wrong password with the same 401 and without creating a session', async () => {
      await service.register(VALID_REGISTRATION);

      const failure = await service
        .login({email: VALID_REGISTRATION.email, password: 'definitely-wrong'})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
        userMessage: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
      expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(1);
    });

    it('rejects a soft-deleted user and keeps the email reserved', async () => {
      await service.register(VALID_REGISTRATION);
      await dataSource
        .getRepository(UserEntity)
        .update({email: VALID_REGISTRATION.email}, {deletedAt: '2026-11-18T13:00:00.000Z'});

      const failure = await service
        .login({email: VALID_REGISTRATION.email, password: VALID_REGISTRATION.password})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: 401,
        userMessage: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
      });
      expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(1);

      const reRegister = await service
        .register(VALID_REGISTRATION)
        .catch((error: unknown) => error);
      expect(reRegister).toMatchObject({code: 'EMAIL_ALREADY_REGISTERED', status: 409});
    });
  });

  describe('refresh rotation and reuse detection (US-203)', () => {
    const hashOf = (token: string): string => createHash('sha256').update(token).digest('hex');

    it('revokes the presented token and stores a fresh hashed pair', async () => {
      const registered = await service.register(VALID_REGISTRATION);

      const rotated = await service.refresh({refreshToken: registered.refreshToken});

      expect(rotated.user).toEqual(registered.user);
      expect(rotated.refreshToken).not.toBe(registered.refreshToken);
      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(tokens).toHaveLength(2);
      expect(
        tokens.find((token) => token.tokenHash === hashOf(registered.refreshToken))?.revokedAt,
      ).toEqual(expect.any(String));
      const fresh = tokens.find((token) => token.tokenHash === hashOf(rotated.refreshToken));
      expect(fresh?.revokedAt).toBeNull();
      expect(fresh?.tokenHash).not.toBe(rotated.refreshToken);

      const payload = new JwtService().verify<{sub: string; id?: number}>(rotated.accessToken, {
        secret: ACCESS_SECRET,
      });
      expect(payload.sub).toBe(registered.user.publicId);
      expect(payload.id).toBeUndefined();
    });

    it('revokes the whole family on replay and rejects the rotated token too', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      const rotated = await service.refresh({refreshToken: registered.refreshToken});

      const replay = await service
        .refresh({refreshToken: registered.refreshToken})
        .catch((error: unknown) => error);
      expect(replay).toMatchObject({
        code: 'REFRESH_TOKEN_REUSED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.REFRESH_TOKEN_REUSED,
      });

      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(tokens).toHaveLength(2);
      expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);

      const rotatedReplay = await service
        .refresh({refreshToken: rotated.refreshToken})
        .catch((error: unknown) => error);
      expect(rotatedReplay).toMatchObject({code: 'REFRESH_TOKEN_REUSED', status: 401});
    });

    it('rejects an expired token with its own stable code', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      await dataSource
        .getRepository(RefreshTokenEntity)
        .createQueryBuilder()
        .update()
        .set({expiresAt: '2020-01-01T00:00:00.000Z'})
        .execute();

      const failure = await service
        .refresh({refreshToken: registered.refreshToken})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'REFRESH_TOKEN_EXPIRED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
      });
    });

    it('rejects an unknown token without touching any session', async () => {
      await service.register(VALID_REGISTRATION);

      const failure = await service
        .refresh({refreshToken: 'never-issued-token'})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.UNAUTHORIZED,
      });
      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].revokedAt).toBeNull();
    });

    it('refreshes only the session owned by the presented token', async () => {
      const owner = await service.register(VALID_REGISTRATION);
      const other = await service.register({
        ...VALID_REGISTRATION,
        email: 'other@example.com',
      });

      const rotated = await service.refresh({refreshToken: other.refreshToken});

      expect(rotated.user.publicId).toBe(other.user.publicId);
      expect(rotated.user.email).toBe(other.user.email);
      expect(rotated.user.publicId).not.toBe(owner.user.publicId);
      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(
        tokens.find((token) => token.tokenHash === hashOf(owner.refreshToken))?.revokedAt,
      ).toBeNull();
    });

    it('serializes concurrent refreshes to one success and one reuse rejection', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      const settle = (promise: Promise<unknown>) =>
        promise.then(
          (value) => ({status: 'fulfilled', value}),
          (reason) => ({status: 'rejected', reason}),
        );

      const results = await Promise.all([
        settle(service.refresh({refreshToken: registered.refreshToken})),
        settle(service.refresh({refreshToken: registered.refreshToken})),
      ]);

      expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      const rejections = results.filter((result) => result.status === 'rejected');
      expect(rejections).toHaveLength(1);
      expect(rejections[0]).toMatchObject({
        reason: {code: 'REFRESH_TOKEN_REUSED', status: 401},
      });
      expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(2);
    });
  });
});

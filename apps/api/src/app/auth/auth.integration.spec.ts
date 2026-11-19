import {createHash} from 'node:crypto';
import {JwtService} from '@nestjs/jwt';
import {AccountTypeEnum} from '@peco/enums';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import type {ConfigService} from '../config/config.service';
import {createTypeOrmOptions} from '../database/database.config';
import {UtcClock} from '../database/clock/utc-clock';
import {
  AccountEntity,
  PasswordResetTokenEntity,
  RefreshTokenEntity,
  UserEntity,
} from '../database/entities';
import type {MailService} from '../mail/mail-service';
import type {PasswordResetMail} from '../mail/types/password-reset-mail.type';
import {AuthService} from './auth.service';
import {AuthLoginRepository} from './services/auth-login.repository';
import {AuthLogoutRepository} from './services/auth-logout.repository';
import {AuthPasswordResetRepository} from './services/auth-password-reset.repository';
import {AuthRefreshRepository} from './services/auth-refresh.repository';
import {AuthRegistrationRepository} from './services/auth-registration.repository';
import {PasswordHasher} from './services/password-hasher';
import {TokenService} from './services/token-service';
import {UserActivityRepository} from './services/user-activity.repository';

jest.setTimeout(180_000);

const ACCESS_SECRET = 'integration-access-secret-at-least-32-chars';
const VALID_REGISTRATION = {
  email: 'user@example.com',
  password: 'correct horse battery',
  name: 'Manuel',
};
const ACTIVITY_DAY_1 = '2026-11-19T15:30:00.000Z';
const ACTIVITY_SAME_DAY_LATER = '2026-11-19T23:59:59.999Z';
const ACTIVITY_DAY_2 = '2026-11-20T08:15:00.000Z';

describe('auth flows (MySQL 8, US-201/US-202/US-203/US-204/US-205/US-206)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: AuthService;
  let hasher: PasswordHasher;
  let activity: UserActivityRepository;
  const activityNow = jest.fn(() => ACTIVITY_DAY_1);
  const activityClock = {now: activityNow} as unknown as UtcClock;
  const sentMails: PasswordResetMail[] = [];
  const mail: MailService = {
    sendPasswordReset: async (message) => {
      sentMails.push(message);
    },
  };
  const capturedMail = (index: number): PasswordResetMail => {
    const message = sentMails[index];
    if (!message) {
      throw new Error(`Missing captured mail at index ${index}`);
    }
    return message;
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

    const configService = {
      config: {
        jwt: {accessSecret: ACCESS_SECRET, refreshSecret: 'integration-refresh-secret-32chars'},
        tokens: {access: '15m', refresh: '30m', reset: '45m'},
      },
    } as unknown as ConfigService;

    hasher = new PasswordHasher();
    activity = new UserActivityRepository(dataSource, activityClock);
    service = new AuthService(
      new AuthRegistrationRepository(dataSource),
      new AuthLoginRepository(dataSource),
      new AuthRefreshRepository(dataSource, new UtcClock()),
      new AuthLogoutRepository(dataSource, new UtcClock()),
      new AuthPasswordResetRepository(dataSource, new UtcClock()),
      hasher,
      new TokenService(new JwtService(), configService, new UtcClock()),
      mail,
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    sentMails.length = 0;
    activityNow.mockReturnValue(ACTIVITY_DAY_1);
    await dataSource.query('DELETE FROM passwordResetTokens');
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

  describe('logout and session revocation (US-204)', () => {
    const hashOf = (token: string): string => createHash('sha256').update(token).digest('hex');

    it('revokes the presented session and rejects a later refresh with 401', async () => {
      const registered = await service.register(VALID_REGISTRATION);

      await expect(
        service.logout({refreshToken: registered.refreshToken}),
      ).resolves.toBeUndefined();

      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].revokedAt).toEqual(expect.any(String));
      expect(tokens[0].tokenHash).toBe(hashOf(registered.refreshToken));

      const failure = await service
        .refresh({refreshToken: registered.refreshToken})
        .catch((error: unknown) => error);
      expect(failure).toMatchObject({
        code: 'REFRESH_TOKEN_REUSED',
        status: 401,
        userMessage: API_ERROR_MESSAGES.REFRESH_TOKEN_REUSED,
      });
    });

    it('is idempotent and keeps the original revocation timestamp', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      await service.logout({refreshToken: registered.refreshToken});

      const findSession = () =>
        dataSource.getRepository(RefreshTokenEntity).findOne({
          where: {tokenHash: hashOf(registered.refreshToken)},
        });
      const first = await findSession();
      await expect(
        service.logout({refreshToken: registered.refreshToken}),
      ).resolves.toBeUndefined();
      const second = await findSession();

      expect(first?.revokedAt).toEqual(expect.any(String));
      expect(second?.revokedAt).toBe(first?.revokedAt);
      expect(await dataSource.getRepository(RefreshTokenEntity).count()).toBe(1);
    });

    it('accepts an unknown token without touching any existing session', async () => {
      const registered = await service.register(VALID_REGISTRATION);

      await expect(service.logout({refreshToken: 'never-issued-token'})).resolves.toBeUndefined();

      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].revokedAt).toBeNull();
      await expect(service.refresh({refreshToken: registered.refreshToken})).resolves.toMatchObject(
        {
          user: {publicId: registered.user.publicId},
        },
      );
    });

    it('revokes only the presented session and leaves another one usable', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      const secondSession = await service.login({
        email: VALID_REGISTRATION.email,
        password: VALID_REGISTRATION.password,
      });

      await service.logout({refreshToken: registered.refreshToken});

      const tokens = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(tokens).toHaveLength(2);
      expect(
        tokens.find((token) => token.tokenHash === hashOf(registered.refreshToken))?.revokedAt,
      ).toEqual(expect.any(String));
      expect(
        tokens.find((token) => token.tokenHash === hashOf(secondSession.refreshToken))?.revokedAt,
      ).toBeNull();

      await expect(
        service.refresh({refreshToken: secondSession.refreshToken}),
      ).resolves.toMatchObject({user: {publicId: registered.user.publicId}});
    });
  });

  describe('forgot and reset password (US-205)', () => {
    const hashOf = (token: string): string => createHash('sha256').update(token).digest('hex');

    it('stores only the hash of the emailed token with the configured TTL', async () => {
      await service.register(VALID_REGISTRATION);

      await expect(service.forgotPassword({email: '  USER@EXAMPLE.COM '})).resolves.toBeUndefined();

      expect(sentMails).toHaveLength(1);
      const rows = await dataSource.getRepository(PasswordResetTokenEntity).find();
      expect(rows).toHaveLength(1);
      expect(rows[0].tokenHash).toBe(hashOf(capturedMail(0).token));
      expect(rows[0].tokenHash).not.toBe(capturedMail(0).token);
      expect(rows[0].usedAt).toBeNull();
      expect(capturedMail(0).to).toBe(VALID_REGISTRATION.email);
      expect(capturedMail(0).expiresAt).toBe(rows[0].expiresAt);

      const ttlMs = Date.parse(rows[0].expiresAt) - Date.now();
      expect(ttlMs).toBeGreaterThan(29 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(45 * 60 * 1000);
    });

    it('stays silent for an unknown email and creates nothing', async () => {
      await expect(service.forgotPassword({email: 'missing@example.com'})).resolves.toBeUndefined();

      expect(sentMails).toHaveLength(0);
      expect(await dataSource.getRepository(PasswordResetTokenEntity).count()).toBe(0);
    });

    it('stays silent for a soft-deleted user', async () => {
      await service.register(VALID_REGISTRATION);
      await dataSource
        .getRepository(UserEntity)
        .update({email: VALID_REGISTRATION.email}, {deletedAt: '2026-11-19T12:00:00.000Z'});

      await expect(
        service.forgotPassword({email: VALID_REGISTRATION.email}),
      ).resolves.toBeUndefined();

      expect(sentMails).toHaveLength(0);
      expect(await dataSource.getRepository(PasswordResetTokenEntity).count()).toBe(0);
    });

    it('changes the password, consumes the token and revokes every session', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      const secondSession = await service.login({
        email: VALID_REGISTRATION.email,
        password: VALID_REGISTRATION.password,
      });
      await service.forgotPassword({email: VALID_REGISTRATION.email});
      const token = capturedMail(0).token;

      await expect(
        service.resetPassword({token, newPassword: 'brand-new-password'}),
      ).resolves.toBeUndefined();

      const user = await dataSource
        .getRepository(UserEntity)
        .findOneByOrFail({email: VALID_REGISTRATION.email});
      expect(await hasher.verify(user.passwordHash, 'brand-new-password')).toBe(true);
      expect(await hasher.verify(user.passwordHash, VALID_REGISTRATION.password)).toBe(false);

      const sessions = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(sessions).toHaveLength(2);
      expect(sessions.every((session) => session.revokedAt !== null)).toBe(true);
      for (const refreshToken of [registered.refreshToken, secondSession.refreshToken]) {
        const failure = await service.refresh({refreshToken}).catch((error: unknown) => error);
        expect(failure).toMatchObject({code: 'REFRESH_TOKEN_REUSED', status: 401});
      }

      const resetTokens = await dataSource.getRepository(PasswordResetTokenEntity).find();
      expect(resetTokens).toHaveLength(1);
      expect(resetTokens[0].usedAt).toEqual(expect.any(String));

      const replay = await service
        .resetPassword({token, newPassword: 'another-password'})
        .catch((error: unknown) => error);
      expect(replay).toMatchObject({
        code: 'INVALID_RESET_TOKEN',
        status: 400,
        userMessage: API_ERROR_MESSAGES.INVALID_RESET_TOKEN,
      });
    });

    it('rejects an unknown token without changing the password or sessions', async () => {
      await service.register(VALID_REGISTRATION);
      await service.forgotPassword({email: VALID_REGISTRATION.email});
      const before = await dataSource
        .getRepository(UserEntity)
        .findOneByOrFail({email: VALID_REGISTRATION.email});

      const failure = await service
        .resetPassword({token: 'never-issued', newPassword: 'brand-new-password'})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'INVALID_RESET_TOKEN',
        status: 400,
        userMessage: API_ERROR_MESSAGES.INVALID_RESET_TOKEN,
      });
      const after = await dataSource
        .getRepository(UserEntity)
        .findOneByOrFail({email: VALID_REGISTRATION.email});
      expect(after.passwordHash).toBe(before.passwordHash);
      const sessions = await dataSource.getRepository(RefreshTokenEntity).find();
      expect(sessions[0].revokedAt).toBeNull();
      const resetTokens = await dataSource.getRepository(PasswordResetTokenEntity).find();
      expect(resetTokens[0].usedAt).toBeNull();
    });

    it('rejects an expired token with 400 INVALID_RESET_TOKEN', async () => {
      await service.register(VALID_REGISTRATION);
      await service.forgotPassword({email: VALID_REGISTRATION.email});
      const repository = dataSource.getRepository(PasswordResetTokenEntity);
      await repository.update(
        {tokenHash: hashOf(capturedMail(0).token)},
        {expiresAt: '2020-01-01T00:00:00.000Z'},
      );

      const failure = await service
        .resetPassword({token: capturedMail(0).token, newPassword: 'brand-new-password'})
        .catch((error: unknown) => error);

      expect(failure).toMatchObject({
        code: 'INVALID_RESET_TOKEN',
        status: 400,
        userMessage: API_ERROR_MESSAGES.INVALID_RESET_TOKEN,
      });
      const stillUnused = await repository.findOneByOrFail({
        tokenHash: hashOf(capturedMail(0).token),
      });
      expect(stillUnused.usedAt).toBeNull();
    });

    it('invalidates an earlier token when a later request is made', async () => {
      await service.register(VALID_REGISTRATION);
      await service.forgotPassword({email: VALID_REGISTRATION.email});
      const firstToken = capturedMail(0).token;

      await service.forgotPassword({email: VALID_REGISTRATION.email});
      const secondToken = capturedMail(1).token;
      const resetTokens = await dataSource.getRepository(PasswordResetTokenEntity).find();
      expect(resetTokens).toHaveLength(2);
      expect(resetTokens.find((row) => row.tokenHash === hashOf(firstToken))?.usedAt).toEqual(
        expect.any(String),
      );
      expect(resetTokens.find((row) => row.tokenHash === hashOf(secondToken))?.usedAt).toBeNull();

      const stale = await service
        .resetPassword({token: firstToken, newPassword: 'brand-new-password'})
        .catch((error: unknown) => error);
      expect(stale).toMatchObject({code: 'INVALID_RESET_TOKEN', status: 400});
      await expect(
        service.resetPassword({token: secondToken, newPassword: 'brand-new-password'}),
      ).resolves.toBeUndefined();
    });
  });

  describe('activity signal (US-206)', () => {
    const findUser = () =>
      dataSource.getRepository(UserEntity).findOneByOrFail({email: VALID_REGISTRATION.email});

    it('writes lastActiveAt once per UTC day with one conditional UPDATE', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      expect((await findUser()).lastActiveAt).toBeNull();

      await activity.touch(registered.user.publicId);
      expect((await findUser()).lastActiveAt).toBe(ACTIVITY_DAY_1);

      await dataSource
        .getRepository(UserEntity)
        .update({publicId: registered.user.publicId}, {lastActiveAt: ACTIVITY_SAME_DAY_LATER});

      await activity.touch(registered.user.publicId);
      expect((await findUser()).lastActiveAt).toBe(ACTIVITY_SAME_DAY_LATER);

      activityNow.mockReturnValue(ACTIVITY_DAY_2);
      await activity.touch(registered.user.publicId);
      expect((await findUser()).lastActiveAt).toBe(ACTIVITY_DAY_2);
    });

    it('reactivates a long-inactive user on the first authenticated request', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      await dataSource
        .getRepository(UserEntity)
        .update({publicId: registered.user.publicId}, {lastActiveAt: '2020-01-01T00:00:00.000Z'});

      activityNow.mockReturnValue(ACTIVITY_DAY_2);
      await activity.touch(registered.user.publicId);

      expect((await findUser()).lastActiveAt).toBe(ACTIVITY_DAY_2);
    });

    it('does not reactivate a soft-deleted user', async () => {
      const registered = await service.register(VALID_REGISTRATION);
      await dataSource
        .getRepository(UserEntity)
        .update({publicId: registered.user.publicId}, {deletedAt: '2026-11-19T13:00:00.000Z'});

      await activity.touch(registered.user.publicId);

      expect((await findUser()).lastActiveAt).toBeNull();
    });
  });
});

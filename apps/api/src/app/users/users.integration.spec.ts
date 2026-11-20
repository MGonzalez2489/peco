import type {UserDataExport} from '@peco/contracts';
import {
  AccountTypeEnum,
  AppThemeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {JwtService} from '@nestjs/jwt';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {AuthService} from '../auth/auth.service';
import {AuthLoginRepository} from '../auth/services/auth-login.repository';
import {AuthLogoutRepository} from '../auth/services/auth-logout.repository';
import {AuthPasswordResetRepository} from '../auth/services/auth-password-reset.repository';
import {AuthRefreshRepository} from '../auth/services/auth-refresh.repository';
import {AuthRegistrationRepository} from '../auth/services/auth-registration.repository';
import {PasswordHasher} from '../auth/services/password-hasher';
import {TokenService} from '../auth/services/token-service';
import type {ConfigService} from '../config/config.service';
import {UtcClock} from '../database/clock/utc-clock';
import type {MailService} from '../mail/mail-service';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  AuditLogEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  RefreshTokenEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../database/entities';
import {ANONYMIZED_PASSWORD_HASH} from './constants/anonymized-password-hash.constant';
import {ANONYMIZED_USER_NAME} from './constants/anonymized-user-name.constant';
import {USER_AUDIT_ENTITY} from './constants/user-audit-entity.constant';
import {USER_DELETE_AUDIT_ACTION} from './constants/user-delete-audit-action.constant';
import {UserDeletionRepository} from './services/user-deletion.repository';
import {UserDataExportRepository} from './services/user-data-export.repository';
import {UserDataExportService} from './services/user-data-export.service';
import {UserPasswordRepository} from './services/user-password.repository';
import {UserProfileRepository} from './services/user-profile.repository';
import {UsersService} from './users.service';

jest.setTimeout(180_000);

const DELETION_AT = '2026-11-19T18:45:00.000Z';
const CHANGE_AT = '2026-11-19T19:00:00.000Z';
const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'a new correct horse';
const ACCESS_SECRET = 'integration-access-secret-at-least-32-chars';
const REFRESH_SECRET = 'integration-refresh-secret-at-least-32-chars';

describe('user profile, password, deletion and export flows (MySQL 8, US-207/US-208/US-209)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: UsersService;
  let exportService: UserDataExportService;
  let authService: AuthService;
  let hasher: PasswordHasher;
  const now = jest.fn(() => DELETION_AT);
  const clock = {now} as unknown as UtcClock;

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

  const seedExportRows = async (user: UserEntity, label: string): Promise<void> => {
    const account = await dataSource.getRepository(AccountEntity).save(
      dataSource.getRepository(AccountEntity).create({
        userId: user.id,
        name: `${label} cash`,
        type: AccountTypeEnum.CASH.toString(),
        initialBalance: 100000,
        currentBalance: 150000,
        includeInTotal: true,
        targetGoal: null,
        creditLimit: null,
        color: '#10B981',
        icon: 'banknote',
        pinToHome: false,
        isRoot: true,
        note: null,
        version: 0,
        deletedAt: null,
      }),
    );
    const category = await dataSource.getRepository(CategoryEntity).save(
      dataSource.getRepository(CategoryEntity).create({
        userId: user.id,
        name: `${label}-category`,
        displayName: `${label} category`,
        icon: 'utensils',
        color: '#F97316',
        applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
        isRoot: false,
        isSystem: false,
        deletedAt: null,
      }),
    );
    const schedule = await dataSource.getRepository(ScheduledTransactionEntity).save(
      dataSource.getRepository(ScheduledTransactionEntity).create({
        userId: user.id,
        name: `${label} schedule`,
        estimatedAmount: 800000,
        type: ScheduledTransactionTypeEnum.EXPENSE.toString(),
        categoryId: category.id,
        sourceAccountId: account.id,
        destinationAccountId: null,
        frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
        interval: 1,
        anchorDate: '2026-12-01',
        nextContemplatedDate: '2026-12-01',
        nextExecutionDate: '2026-12-01',
        autoApply: true,
        active: true,
        totalOccurrences: null,
        completedOccurrences: 0,
        endDate: null,
        version: 0,
        deletedAt: null,
      }),
    );
    const movement = await dataSource.getRepository(MovementEntity).save(
      dataSource.getRepository(MovementEntity).create({
        userId: user.id,
        accountId: account.id,
        targetAccountId: null,
        categoryId: category.id,
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 45000,
        date: '2026-11-12T15:04:05.123Z',
        note: `${label} note`,
        reversalId: null,
        replacesMovementId: null,
        isReversal: false,
        isReversed: false,
        isCanceled: false,
        scheduledTransactionId: schedule.id,
        version: 0,
        deletedAt: null,
      }),
    );
    await dataSource.getRepository(ScheduledExecutionEntity).save(
      dataSource.getRepository(ScheduledExecutionEntity).create({
        scheduledTransactionId: schedule.id,
        contemplatedDate: '2026-12-01',
        occurrenceDate: '2026-12-01',
        movementId: movement.id,
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        reason: null,
        attempts: 0,
      }),
    );
    const snapshot = await dataSource.getRepository(PeriodSnapshotEntity).save(
      dataSource.getRepository(PeriodSnapshotEntity).create({
        userId: user.id,
        period: '2026-11',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        globalInitialBalance: 100000,
        globalFinalBalance: 150000,
        totalInflows: 300000,
        totalOutflows: 45000,
        totalTransfers: 0,
        totalTransactionsCount: 1,
      }),
    );
    await dataSource.getRepository(AccountPeriodBalanceEntity).save(
      dataSource.getRepository(AccountPeriodBalanceEntity).create({
        snapshotId: snapshot.id,
        accountId: account.id,
        accountName: account.name,
        accountType: AccountTypeEnum.CASH.toString(),
        color: account.color,
        icon: account.icon,
        includeInTotal: true,
        initialBalance: 100000,
        finalBalance: 150000,
        totalTransactions: 1,
        totalInflows: 300000,
        totalOutflows: 45000,
        totalTransfers: 0,
      }),
    );
  };

  const exportDocument = async (publicId: string): Promise<UserDataExport> => {
    const stream = await exportService.exportData(publicId, '01JC7Z3Q9K');
    let text = '';
    for await (const chunk of stream) {
      text += String(chunk);
    }
    return (JSON.parse(text) as {data: UserDataExport}).data;
  };

  const collectKeys = (value: unknown, keys: Set<string>): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => collectKeys(item, keys));
      return;
    }
    if (typeof value !== 'object' || value === null) {
      return;
    }

    for (const [key, nested] of Object.entries(value)) {
      keys.add(key);
      collectKeys(nested, keys);
    }
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

    const configService = {
      config: {
        jwt: {accessSecret: ACCESS_SECRET, refreshSecret: REFRESH_SECRET},
        tokens: {access: '15m', refresh: '30m', reset: '45m'},
      },
    } as unknown as ConfigService;
    const mail = {sendPasswordReset: jest.fn()} as unknown as MailService;
    const tokens = new TokenService(new JwtService(), configService, new UtcClock());

    hasher = new PasswordHasher();
    authService = new AuthService(
      new AuthRegistrationRepository(dataSource),
      new AuthLoginRepository(dataSource),
      new AuthRefreshRepository(dataSource, new UtcClock()),
      new AuthLogoutRepository(dataSource, new UtcClock()),
      new AuthPasswordResetRepository(dataSource, new UtcClock()),
      hasher,
      tokens,
      mail,
    );
    service = new UsersService(
      new UserProfileRepository(dataSource),
      new UserDeletionRepository(dataSource, clock),
      new UserPasswordRepository(dataSource, clock),
      hasher,
    );
    exportService = new UserDataExportService(
      new UserProfileRepository(dataSource),
      new UserDataExportRepository(dataSource),
      new UtcClock(),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    now.mockReturnValue(DELETION_AT);
    await dataSource.query('DELETE FROM auditLogs');
    await dataSource.query('DELETE FROM refreshTokens');
    await dataSource.query('DELETE FROM accountPeriodBalances');
    await dataSource.query('DELETE FROM periodSnapshots');
    await dataSource.query('DELETE FROM scheduledExecutions');
    await dataSource.query('DELETE FROM movements');
    await dataSource.query('DELETE FROM scheduledTransactions');
    await dataSource.query('DELETE FROM userPreferences');
    await dataSource.query('DELETE FROM categories');
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

  it('rejects a wrong current password without changing credentials or sessions', async () => {
    const user = await seedUser('user@example.com', 'Manuel');

    await expect(
      service.changePassword(user.publicId, {
        currentPassword: 'wrong-password',
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({status: 401, code: 'UNAUTHORIZED'});

    const stored = await storedUser(user.id);
    expect(stored?.passwordHash).toBe(user.passwordHash);
    expect(await hasher.verify(stored?.passwordHash ?? '', NEW_PASSWORD)).toBe(false);
    expect(
      await dataSource.getRepository(RefreshTokenEntity).findOneByOrFail({userId: user.id}),
    ).toMatchObject({revokedAt: null});
    expect(await dataSource.getRepository(AuditLogEntity).count()).toBe(0);
  });

  it('returns 404 when changing the password of a soft-deleted user', async () => {
    const user = await seedUser('user@example.com', 'Manuel');
    await service.remove(user.publicId, {password: PASSWORD});

    await expect(
      service.changePassword(user.publicId, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
      }),
    ).rejects.toMatchObject({status: 404, code: 'NOT_FOUND'});
    expect((await storedUser(user.id))?.passwordHash).toBe(ANONYMIZED_PASSWORD_HASH);
  });

  it('changes the hash, revokes every session and accepts only the new password (flow 32)', async () => {
    const user = await seedUser('user@example.com', 'Manuel');
    const session = await authService.login({email: user.email, password: PASSWORD});
    now.mockReturnValue(CHANGE_AT);

    await service.changePassword(user.publicId, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    const stored = await storedUser(user.id);
    expect(stored?.passwordHash).not.toBe(user.passwordHash);
    expect(await hasher.verify(stored?.passwordHash ?? '', NEW_PASSWORD)).toBe(true);
    expect(await hasher.verify(stored?.passwordHash ?? '', PASSWORD)).toBe(false);

    const tokens = await dataSource.getRepository(RefreshTokenEntity).find({
      where: {userId: user.id},
    });
    expect(tokens).toHaveLength(2);
    expect(tokens.every((token) => token.revokedAt === CHANGE_AT)).toBe(true);

    await expect(authService.refresh({refreshToken: session.refreshToken})).rejects.toMatchObject({
      status: 401,
      code: 'REFRESH_TOKEN_REUSED',
    });
    await expect(authService.login({email: user.email, password: PASSWORD})).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    await expect(
      authService.login({email: user.email, password: NEW_PASSWORD}),
    ).resolves.toMatchObject({user: {publicId: user.publicId}});
  });

  it('leaves other users and their sessions untouched', async () => {
    const first = await seedUser('first@example.com', 'Manuel');
    const other = await seedUser('second@example.com', 'Ana');
    const otherSession = await authService.login({email: other.email, password: PASSWORD});

    await service.changePassword(first.publicId, {
      currentPassword: PASSWORD,
      newPassword: NEW_PASSWORD,
    });

    expect((await storedUser(other.id))?.passwordHash).toBe(other.passwordHash);
    expect(
      await dataSource.getRepository(RefreshTokenEntity).findOneByOrFail({userId: other.id}),
    ).toMatchObject({revokedAt: null});
    await expect(
      authService.refresh({refreshToken: otherSession.refreshToken}),
    ).resolves.toMatchObject({
      user: {publicId: other.publicId},
    });
    await expect(
      authService.login({email: other.email, password: PASSWORD}),
    ).resolves.toMatchObject({user: {publicId: other.publicId}});
  });

  it('exports every owned row with cents, no internal id and no other user data (flow 33)', async () => {
    const first = await seedUser('first@example.com', 'Manuel');
    const second = await seedUser('second@example.com', 'Ana');
    await seedExportRows(first, 'first');
    await seedExportRows(second, 'second');

    const exported = await exportDocument(first.publicId);
    const other = await exportDocument(second.publicId);

    expect(exported.schemaVersion).toBe(1);
    expect(exported.user.publicId).toBe(first.publicId);
    expect(exported.preferences.theme).toBe(AppThemeEnum.SYSTEM.toString());
    expect(exported.accounts).toHaveLength(1);
    expect(exported.categories).toHaveLength(1);
    expect(exported.movements).toHaveLength(1);
    expect(exported.scheduledTransactions).toHaveLength(1);
    expect(exported.scheduledExecutions).toHaveLength(1);
    expect(exported.periodSnapshots).toHaveLength(1);
    expect(exported.accounts[0].currentBalance).toBe(150000);
    expect(exported.movements[0].amount).toBe(45000);
    expect(exported.periodSnapshots[0].globalFinalBalance).toBe(150000);
    expect(exported.periodSnapshots[0].accountBalances[0].finalBalance).toBe(150000);

    const keys = new Set<string>();
    collectKeys(exported, keys);
    expect(keys.has('id')).toBe(false);
    expect(keys.has('passwordHash')).toBe(false);
    expect(keys.has('tokenHash')).toBe(false);
    expect(keys.has('auditLogs')).toBe(false);

    const ownPublicIds = new Set(
      [
        exported.user.publicId,
        ...[
          ...exported.accounts,
          ...exported.categories,
          ...exported.movements,
          ...exported.scheduledTransactions,
          ...exported.scheduledExecutions,
          ...exported.periodSnapshots,
        ].map((row) => row.publicId),
      ],
    );
    const otherPublicIds = [
      other.user.publicId,
      ...[
        ...other.accounts,
        ...other.categories,
        ...other.movements,
        ...other.scheduledTransactions,
        ...other.scheduledExecutions,
        ...other.periodSnapshots,
      ].map((row) => row.publicId),
    ];
    expect(otherPublicIds.some((publicId) => ownPublicIds.has(publicId))).toBe(false);
  });

  it('exports defaults when the user has no preferences row', async () => {
    const user = await seedUser('user@example.com', 'Manuel');
    await dataSource.getRepository(UserPreferencesEntity).delete({userId: user.id});

    const exported = await exportDocument(user.publicId);

    expect(exported.preferences).toEqual({
      theme: AppThemeEnum.LIGHT.toString(),
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: false},
      movements: {hideReversal: true},
    });
  });
});

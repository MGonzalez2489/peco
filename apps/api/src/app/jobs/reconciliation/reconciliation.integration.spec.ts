import type {CategoryApplyType} from '@peco/contracts';
import {
  AccountTypeEnum,
  AuditActionEnum,
  AuditEntityEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, type DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../../config/app-config';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import {createTypeOrmOptions} from '../../database/database.config';
import {
  AccountEntity,
  AuditLogEntity,
  CategoryEntity,
  MovementEntity,
  UserEntity,
} from '../../database/entities';
import {ReconciliationAlertService} from './services/reconciliation-alert.service';
import {ReconciliationMetricsService} from './services/reconciliation-metrics.service';
import {ReconciliationRepository} from './services/reconciliation.repository';
import {ReconciliationService} from './services/reconciliation.service';

jest.setTimeout(180_000);

const NOW = '2026-11-22T03:00:00.000Z';
const OLD = '2026-01-01T03:00:00.000Z';
const DATE = '2026-11-21T10:00:00.000Z';

describe('nightly reconciliation (MySQL 8, US-510)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: ReconciliationService;
  let metrics: ReconciliationMetricsService;
  let alertSpy: jest.SpyInstance;

  const seedUser = async (email: string, overrides: Partial<UserEntity> = {}): Promise<UserEntity> =>
    dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: NOW,
        deletedAt: null,
        ...overrides,
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

  const seedCategory = async (
    user: UserEntity,
    applyType: CategoryApplyType = CategoryApplyTypeEnum.EXPENSE.toString(),
  ): Promise<CategoryEntity> =>
    dataSource.getRepository(CategoryEntity).save(
      dataSource.getRepository(CategoryEntity).create({
        userId: user.id,
        name: `categoria-${Math.random().toString(36).slice(2, 10)}`,
        displayName: 'Categoría',
        icon: 'tag',
        color: '#F97316',
        applyType,
        isRoot: false,
        isSystem: false,
        deletedAt: null,
      }),
    );

  const seedMovement = async (
    user: UserEntity,
    account: AccountEntity,
    category: CategoryEntity,
    overrides: Partial<MovementEntity> = {},
  ): Promise<MovementEntity> =>
    dataSource.getRepository(MovementEntity).save(
      dataSource.getRepository(MovementEntity).create({
        userId: user.id,
        accountId: account.id,
        targetAccountId: null,
        categoryId: category.id,
        type: MovementTypeEnum.INCOME.toString(),
        amount: 1_000,
        date: DATE,
        note: null,
        reversalId: null,
        replacesMovementId: null,
        isReversal: false,
        isReversed: false,
        isCanceled: false,
        scheduledTransactionId: null,
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

    const config = new ConfigService({
      operational: {inactiveUserDays: 90},
      jobs: {reconciliationCron: '0 3 * * *'},
    } as AppConfig);
    const clock = {now: () => NOW} as unknown as UtcClock;
    metrics = new ReconciliationMetricsService();
    const alerts = new ReconciliationAlertService();
    alertSpy = jest.spyOn(alerts, 'drift');
    service = new ReconciliationService(
      config,
      clock,
      new ReconciliationRepository(dataSource),
      metrics,
      alerts,
    );
  });

  beforeEach(async () => {
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await dataSource.query('DELETE FROM auditLogs');
    await dataSource.query('DELETE FROM movements');
    await dataSource.query('DELETE FROM accounts');
    await dataSource.query('DELETE FROM categories');
    await dataSource.query('DELETE FROM users');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');

    metrics.reset();
    alertSpy.mockClear();
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('reports zero drift for a correct ledger with transfers and canceled rows', async () => {
    const user = await seedUser('recon-correct@example.com');
    const source = await seedAccount(user, {initialBalance: 100_000, currentBalance: 100_000});
    const target = await seedAccount(user, {initialBalance: 50_000, currentBalance: 53_000});
    const category = await seedCategory(user);

    await seedMovement(user, source, category, {amount: 5_000});
    await seedMovement(user, source, category, {
      amount: 2_000,
      type: MovementTypeEnum.EXPENSE.toString(),
    });
    await seedMovement(user, source, category, {
      amount: 3_000,
      type: MovementTypeEnum.TRANSFER.toString(),
      targetAccountId: target.id,
    });
    await seedMovement(user, source, category, {amount: 9_999, isCanceled: true});

    const result = await service.reconcile();

    expect(result).toEqual({acquired: true, scannedAccounts: 2, mismatches: 0});
    expect(metrics.snapshot().value).toBe(0);
    expect(alertSpy).not.toHaveBeenCalled();
    expect(await dataSource.getRepository(AuditLogEntity).countBy({userId: user.id})).toBe(0);
  });

  it('audits, logs and counts drift without changing the stored balance', async () => {
    const user = await seedUser('recon-drift@example.com');
    const account = await seedAccount(user, {initialBalance: 100_000, currentBalance: 99_900});

    const result = await service.reconcile();

    expect(result).toEqual({acquired: true, scannedAccounts: 1, mismatches: 1});
    expect(metrics.snapshot()).toEqual({name: 'reconciliation_drift_total', value: 1});
    expect(alertSpy).toHaveBeenCalledWith({
      userId: user.id,
      accountPublicId: account.publicId,
      expectedBalance: 100_000,
      currentBalance: 99_900,
      delta: 100,
    });

    const audit = await dataSource.getRepository(AuditLogEntity).findOneByOrFail({userId: user.id});
    expect(audit.entity).toBe(AuditEntityEnum.ACCOUNTS.toString());
    expect(audit.action).toBe(AuditActionEnum.RECONCILE_MISMATCH.toString());
    expect(audit.entityId).toBe(account.publicId);
    expect(audit.before).toEqual({currentBalance: 99_900});
    expect(audit.after).toEqual({
      expectedBalance: 100_000,
      delta: 100,
      autoCorrected: false,
    });

    const stored = await dataSource.getRepository(AccountEntity).findOneByOrFail({id: account.id});
    expect(stored.currentBalance).toBe(99_900);
  });

  it('excludes inactive users and deleted users', async () => {
    const active = await seedUser('recon-active@example.com');
    const inactive = await seedUser('recon-inactive@example.com', {lastActiveAt: OLD});
    const deleted = await seedUser('recon-deleted@example.com', {deletedAt: NOW});
    const activeAccount = await seedAccount(active, {
      initialBalance: 10_000,
      currentBalance: 0,
    });
    await seedAccount(inactive, {initialBalance: 20_000, currentBalance: 0});
    await seedAccount(deleted, {initialBalance: 30_000, currentBalance: 0});

    const result = await service.reconcile();

    expect(result).toEqual({acquired: true, scannedAccounts: 1, mismatches: 1});
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0]?.[0].accountPublicId).toBe(activeAccount.publicId);
    expect(await dataSource.getRepository(AuditLogEntity).countBy({userId: inactive.id})).toBe(0);
    expect(await dataSource.getRepository(AuditLogEntity).countBy({userId: deleted.id})).toBe(0);
  });

  it('ignores soft-deleted and canceled movements', async () => {
    const user = await seedUser('recon-ignored@example.com');
    const account = await seedAccount(user, {initialBalance: 100_000, currentBalance: 107_000});
    const category = await seedCategory(user);

    await seedMovement(user, account, category, {amount: 10_000});
    await seedMovement(user, account, category, {
      amount: 5_000,
      deletedAt: NOW,
    });
    await seedMovement(user, account, category, {
      amount: 7_000,
      isCanceled: true,
    });

    const result = await service.reconcile();

    expect(result.mismatches).toBe(1);
    expect(alertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        accountPublicId: account.publicId,
        expectedBalance: 110_000,
        currentBalance: 107_000,
        delta: 3_000,
      }),
    );
  });

  it('applies reversal and transfer impacts to both sides', async () => {
    const user = await seedUser('recon-reversal@example.com');
    const source = await seedAccount(user, {initialBalance: 200_000, currentBalance: 195_000});
    const target = await seedAccount(user, {initialBalance: 0, currentBalance: 10_000});
    const category = await seedCategory(user);

    await seedMovement(user, source, category, {
      amount: 10_000,
      type: MovementTypeEnum.TRANSFER.toString(),
      targetAccountId: target.id,
    });
    await seedMovement(user, source, category, {amount: 10_000});
    await seedMovement(user, source, category, {
      amount: 5_000,
      type: MovementTypeEnum.EXPENSE.toString(),
      isReversal: true,
    });

    const result = await service.reconcile();

    expect(result).toEqual({acquired: true, scannedAccounts: 2, mismatches: 0});
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

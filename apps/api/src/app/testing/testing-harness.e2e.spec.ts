import {AccountTypeEnum, RecurrenceFrequencyEnum} from '@peco/enums';
import {AuditLogEntity, CategoryEntity, UserEntity} from '../database/entities';
import {registerE2eUser} from './e2e-auth';
import {closeE2eApp, createE2eApp, type E2eTestApp} from './e2e-app';
import {
  createAccount,
  createCategory,
  createClosedPeriod,
  createMovement,
  createSchedule,
  createUser,
} from './entity-factories';
import {fixedUtcClock} from './fixed-clock';
import {
  resetTestDatabase,
  startTestDatabase,
  stopTestDatabase,
  type TestDatabase,
} from './test-database';

jest.setTimeout(180_000);

const NOW = '2026-04-15T12:00:00.000Z';

describe('EP-11 harness (US-1101)', () => {
  let database: TestDatabase;
  let e2e: E2eTestApp | undefined;

  beforeAll(async () => {
    database = await startTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase(database.dataSource);
  });

  afterEach(async () => {
    await closeE2eApp(e2e);
    e2e = undefined;
  });

  afterAll(async () => {
    await stopTestDatabase(database);
  });

  it('provides a deterministic clock with ISO-normalized instants', () => {
    const clock = fixedUtcClock('2026-04-15T12:00:00Z');

    expect(clock.now()).toBe(NOW);
    expect(clock.plusSeconds(90)).toBe('2026-04-15T12:01:30.000Z');
    expect(() => fixedUtcClock('not-a-date')).toThrow(/Invalid fixed clock timestamp/);
  });

  it('creates entities with valid defaults and explicit overrides', async () => {
    const user = await createUser(database.dataSource);
    const account = await createAccount(database.dataSource, user, {
      type: AccountTypeEnum.CREDIT.toString(),
      currentBalance: -150_000,
    });
    const category = await createCategory(database.dataSource, user, {displayName: 'Comida'});
    const movement = await createMovement(database.dataSource, user, account, category, {
      amount: 42_000,
    });
    const schedule = await createSchedule(database.dataSource, user, account, category, {
      frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
    });
    const period = await createClosedPeriod(database.dataSource, user, '2026-03');

    expect(account.currentBalance).toBe(-150_000);
    expect(category.displayName).toBe('Comida');
    expect(movement.amount).toBe(42_000);
    expect(schedule.nextExecutionDate).toBe('2026-01-30');
    expect(period.period).toBe('2026-03');
    expect(await database.dataSource.getRepository(UserEntity).count()).toBe(1);
  });

  it('cleans every table and reseeds the global category catalog', async () => {
    const user = await createUser(database.dataSource);
    await createAccount(database.dataSource, user);
    expect(await database.dataSource.getRepository(UserEntity).count()).toBe(1);

    await resetTestDatabase(database.dataSource);

    expect(await database.dataSource.getRepository(UserEntity).count()).toBe(0);
    expect(await database.dataSource.getRepository(AuditLogEntity).count()).toBe(0);
    expect(
      await database.dataSource
        .getRepository(CategoryEntity)
        .createQueryBuilder('category')
        .where('category.userId IS NULL')
        .getCount(),
    ).toBe(10);
  });

  it('boots the real HTTP pipeline with one command-worthy database', async () => {
    e2e = await createE2eApp(database, NOW);

    const health = await e2e.http.get('/health').expect(200);
    expect(health.body).toMatchObject({status: 'ok', db: 'up'});
    expect(health.body.data).toBeUndefined();

    const session = await registerE2eUser(e2e.http, 'harness');
    const categories = await e2e.http
      .get('/api/categories')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    const accounts = await e2e.http
      .get('/api/accounts')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);

    expect(categories.body.data).toHaveLength(10);
    expect(categories.body.error).toBeNull();
    expect(categories.body.meta.correlationId).toEqual(expect.any(String));
    expect(accounts.body.data).toEqual([
      expect.objectContaining({isRoot: true, name: 'Efectivo', currentBalance: 0}),
    ]);
  });
});

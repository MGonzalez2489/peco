import {randomUUID} from 'node:crypto';
import {In} from 'typeorm';
import {
  AccountTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
} from '@peco/enums';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  UserEntity,
} from '../database/entities';
import {authHeaders, registerE2eUser, withIdempotency} from './e2e-auth';
import {closeE2eApp, createE2eApp, type E2eTestApp} from './e2e-app';
import {createMovement as createMovementRow} from './entity-factories';
import {
  resetTestDatabase,
  startTestDatabase,
  stopTestDatabase,
  type TestDatabase,
} from './test-database';

jest.setTimeout(300_000);

const NOW = '2026-11-15T12:00:00.000Z';
const MOVEMENT_COUNT = 10_000;
const ACCOUNT_COUNT = 1_000;
const LIST_BUDGET_MS = 300;
const REPORT_BUDGET_MS = 500;
const CLOSE_BUDGET_MS = 5_000;

interface ExplainRow {
  readonly id: number;
  readonly select_type: string;
  readonly table: string;
  readonly type: string;
  readonly key: string | null;
  readonly rows: number;
  readonly Extra: string;
}

interface ListResponse {
  readonly data: readonly {readonly publicId: string; readonly date: string}[];
  readonly meta: {
    readonly nextCursor: string | null;
    readonly totals: {readonly count: number};
  };
}

const pad = (value: number): string => String(value).padStart(2, '0');

const periodList = (count: number, endYear: number, endMonth: number): readonly string[] =>
  Array.from({length: count}, (_, index) => {
    const monthIndex = endYear * 12 + (endMonth - 1) - (count - 1 - index);
    return `${Math.floor(monthIndex / 12)}-${pad((monthIndex % 12) + 1)}`;
  });

const elapsedMs = (startedAt: bigint): number =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

describe('Performance and load E2E (US-1106)', () => {
  let database: TestDatabase;
  let e2e: E2eTestApp;
  let token: string;
  let accountId: number;
  let categoryIds: Record<string, string>;

  beforeAll(async () => {
    database = await startTestDatabase();
    await resetTestDatabase(database.dataSource);
    e2e = await createE2eApp(database, NOW);

    const session = await registerE2eUser(e2e.http, 'performance');
    token = session.accessToken;
    categoryIds = await readCategoryIds(token);
    const account = await createAccountViaHttp(token, 0);
    accountId = (await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId: account.publicId})).id;

    await seedMovements(database, accountId, categoryIds, MOVEMENT_COUNT);
    await seedSnapshots(database, session.userPublicId, periodList(24, 2026, 11));
  });

  afterAll(async () => {
    await closeE2eApp(e2e);
    await stopTestDatabase(database);
  });

  const readCategoryIds = async (accessToken: string): Promise<Record<string, string>> => {
    const response = await e2e.http
      .get('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const items = response.body.data as readonly {displayName: string; publicId: string}[];
    return Object.fromEntries(items.map((item) => [item.displayName, item.publicId]));
  };

  const createAccountViaHttp = async (
    accessToken: string,
    initialBalance: number,
  ): Promise<{publicId: string}> => {
    const response = await e2e.http
      .post('/api/accounts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Cuenta de carga',
        type: AccountTypeEnum.CASH.toString(),
        initialBalance,
      })
      .expect(201);
    return response.body.data as {publicId: string};
  };

  const seedMovements = async (
    target: TestDatabase,
    ownerAccountId: number,
    ids: Record<string, string>,
    count: number,
  ): Promise<void> => {
    const owner = await target.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({id: ownerAccountId});
    const categories = await target.dataSource
      .getRepository(CategoryEntity)
      .find({where: {publicId: In([ids['Nómina'], ids['Servicios']])}});
    const categoryIdOf = (name: string): number => {
      const row = categories.find((category) => category.publicId === ids[name]);
      if (!row) {
        throw new Error(`Missing category ${name}`);
      }
      return row.id;
    };
    const periods = periodList(24, 2026, 11);

    for (let offset = 0; offset < count; offset += 1_000) {
      const rows = Array.from({length: Math.min(1_000, count - offset)}, (_, index) => {
        const position = offset + index;
        const period = periods[position % periods.length];
        const day = pad((position % 28) + 1);
        const type =
          position % 2 === 0
            ? MovementTypeEnum.INCOME.toString()
            : MovementTypeEnum.EXPENSE.toString();
        return [
          randomUUID(),
          owner.userId,
          ownerAccountId,
          null,
          categoryIdOf(type === MovementTypeEnum.INCOME.toString() ? 'Nómina' : 'Servicios'),
          type,
          100 + (position % 5_000),
          `${period}-${day}T12:00:00.000Z`,
          null,
          null,
          null,
          0,
          0,
          0,
          null,
          0,
          NOW,
          NOW,
          null,
        ];
      });

      await target.dataSource.query(
        `INSERT INTO movements (
          publicId, userId, accountId, targetAccountId, categoryId, type, amount, date,
          note, reversalId, replacesMovementId, isReversal, isReversed, isCanceled,
          scheduledTransactionId, version, createdAt, updatedAt, deletedAt
        ) VALUES ?`,
        [rows],
      );
    }
  };

  const seedSnapshots = async (
    target: TestDatabase,
    userPublicId: string,
    periods: readonly string[],
  ): Promise<void> => {
    const user = await target.dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({publicId: userPublicId});
    const repository = target.dataSource.getRepository(PeriodSnapshotEntity);
    await repository.save(
      periods.map((period, index) =>
        repository.create({
          userId: user.id,
          period,
          startDate: `${period}-01`,
          endDate: `${period}-28`,
          globalInitialBalance: index * 100_000,
          globalFinalBalance: (index + 1) * 100_000,
          totalInflows: 200_000,
          totalOutflows: 100_000,
          totalTransfers: 0,
          totalTransactionsCount: 400,
        }),
      ),
    );
  };

  const explain = async (sql: string, parameters: readonly unknown[]): Promise<ExplainRow[]> =>
    (await database.dataSource.query(`EXPLAIN ${sql}`, [...parameters])) as ExplainRow[];

  it('uses the owner/date index for the first and deep cursor pages', async () => {
    const userId = (await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({id: accountId})).userId;
    const first = await explain(
      `SELECT id, date, type, amount FROM movements
       WHERE userId = ? AND deletedAt IS NULL
       ORDER BY date DESC, id DESC LIMIT 21`,
      [userId],
    );
    const deep = await explain(
      `SELECT id, date, type, amount FROM movements
       WHERE userId = ? AND deletedAt IS NULL
         AND (date < ? OR (date = ? AND id < ?))
       ORDER BY date DESC, id DESC LIMIT 21`,
      [userId, '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z', 1],
    );

    for (const plan of [first, deep]) {
      expect(plan.length).toBeGreaterThan(0);
      expect(plan.every((row) => row.type !== 'ALL')).toBe(true);
      expect(plan.some((row) => row.key === 'IDXMovementsUserIdDate')).toBe(true);
      expect(Number(plan[0].rows)).toBeLessThan(MOVEMENT_COUNT);
    }
  });

  it('paginates by keyset without drifting or repeating rows', async () => {
    const range = 'from=2024-12-01&to=2026-11-30';
    const seen = new Set<string>();
    let cursor: string | null = null;
    let pages = 0;

    for (;;) {
      const query = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
      const response = await e2e.http
        .get(`/api/movements?${range}&limit=100${query}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const body = response.body as ListResponse;
      expect(body.data.length).toBeLessThanOrEqual(100);
      for (const item of body.data) {
        expect(seen.has(item.publicId)).toBe(false);
        seen.add(item.publicId);
      }
      pages += 1;
      cursor = body.meta.nextCursor;
      if (cursor === null || pages === 6) {
        break;
      }
    }

    expect(pages).toBe(6);
    expect(seen.size).toBe(600);
  });

  it('answers list and dashboard reads within the documented budgets', async () => {
    const list = `/api/movements?from=2024-12-01&to=2026-11-30&limit=20`;
    const report = `/api/reports/dashboard?from=2025-12&to=2026-11`;
    await e2e.http.get(list).set('Authorization', `Bearer ${token}`).expect(200);
    await e2e.http.get(report).set('Authorization', `Bearer ${token}`).expect(200);

    const listTimes: number[] = [];
    const reportTimes: number[] = [];
    for (let index = 0; index < 5; index += 1) {
      const listStart = process.hrtime.bigint();
      await e2e.http.get(list).set('Authorization', `Bearer ${token}`).expect(200);
      listTimes.push(elapsedMs(listStart));

      const reportStart = process.hrtime.bigint();
      await e2e.http.get(report).set('Authorization', `Bearer ${token}`).expect(200);
      reportTimes.push(elapsedMs(reportStart));
    }

    expect(Math.max(...listTimes)).toBeLessThan(LIST_BUDGET_MS);
    expect(Math.max(...reportTimes)).toBeLessThan(REPORT_BUDGET_MS);
  });

  it('closes a period with 1k accounts and one consistent snapshot row per account', async () => {
    const session = await registerE2eUser(e2e.http, 'close-1k');
    const user = await database.dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({publicId: session.userPublicId});
    const ids = await readCategoryIds(session.accessToken);

    const rows = Array.from({length: ACCOUNT_COUNT}, (_, index) => [
      randomUUID(),
      user.id,
      `Cuenta ${pad(index)}`,
      AccountTypeEnum.CASH.toString(),
      0,
      0,
      1,
      null,
      null,
      null,
      null,
      false,
      false,
      null,
      0,
      '2026-04-01T00:00:00.000Z',
      NOW,
      null,
    ]);
    await database.dataSource.query(
      `INSERT INTO accounts (
        publicId, userId, name, type, initialBalance, currentBalance, includeInTotal,
        targetGoal, creditLimit, color, icon, pinToHome, isRoot, note, version,
        createdAt, updatedAt, deletedAt
      ) VALUES ?`,
      [rows],
    );
    const firstAccount = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({userId: user.id, name: 'Cuenta 00'});
    const firstCategory = await database.dataSource
      .getRepository(CategoryEntity)
      .findOneByOrFail({publicId: ids['Nómina']});
    await createMovementRow(
      database.dataSource,
      user,
      firstAccount,
      firstCategory,
      {type: MovementTypeEnum.INCOME.toString(), amount: 1_000, date: '2026-04-10T12:00:00.000Z'},
    );
    await database.dataSource.query('UPDATE accounts SET currentBalance = ? WHERE id = ?', [
      1_000,
      firstAccount.id,
    ]);

    const started = process.hrtime.bigint();
    await withIdempotency(
      e2e.http
        .post('/api/periods/2026-04/close')
        .set('Authorization', `Bearer ${session.accessToken}`),
      'close-1k',
    )
      .send({})
      .expect(201);
    const duration = elapsedMs(started);

    const snapshot = await database.dataSource.getRepository(PeriodSnapshotEntity).findOneByOrFail({
      userId: user.id,
      period: '2026-04',
    });
    const balances = await database.dataSource.getRepository(AccountPeriodBalanceEntity).find({
      where: {snapshotId: snapshot.id},
      take: ACCOUNT_COUNT + 1,
    });
    expect(duration).toBeLessThan(CLOSE_BUDGET_MS);
    expect(balances).toHaveLength(ACCOUNT_COUNT);
    expect(snapshot.globalFinalBalance).toBe(1_000);
    expect(balances.reduce((total, row) => total + row.finalBalance, 0)).toBe(1_000);
  });

  it('applies a concurrent duplicate-key burst exactly once', async () => {
    const session = await registerE2eUser(e2e.http, 'duplicate-burst');
    const account = await createAccountViaHttp(session.accessToken, 0);
    const key = `duplicate-burst-${randomUUID()}-${randomUUID()}`;
    const body = {
      type: MovementTypeEnum.INCOME.toString(),
      amount: 2_500,
      date: '2026-11-10T12:00:00.000Z',
      accountPublicId: account.publicId,
      categoryPublicId: categoryIds['Nómina'],
    };

    const responses = await Promise.all(
      Array.from({length: 50}, () =>
        e2e.http
          .post('/api/movements')
          .set('Authorization', `Bearer ${session.accessToken}`)
          .set('Idempotency-Key', key)
          .send(body),
      ),
    );

    expect(responses.every(({status}) => status === 201)).toBe(true);
    expect(
      responses.filter(({headers}) => headers['idempotency-replayed'] === 'true'),
    ).toHaveLength(49);

    const ownerAccount = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId: account.publicId});
    expect(ownerAccount.currentBalance).toBe(2_500);
    expect(
      await database.dataSource.getRepository(MovementEntity).count({
        where: {accountId: ownerAccount.id},
      }),
    ).toBe(1);
  });

  it('keeps a repeated daily sweep free of duplicate occurrences', async () => {
    const session = await registerE2eUser(e2e.http, 'soak-sweep');
    const account = await createAccountViaHttp(session.accessToken, 10_000);
    const created = await e2e.http
      .post('/api/scheduled-transactions')
      .set(authHeaders(session))
      .send({
        name: 'Diaria',
        estimatedAmount: 1_000,
        type: MovementTypeEnum.EXPENSE.toString(),
        categoryPublicId: categoryIds['Servicios'],
        sourceAccountPublicId: account.publicId,
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        anchorDate: '2026-11-10',
        autoApply: true,
        totalOccurrences: null,
        endDate: null,
      })
      .expect(201);
    const schedulePublicId = (created.body.data as {publicId: string}).publicId;

    for (let index = 0; index < 3; index += 1) {
      await withIdempotency(
        e2e.http
          .post('/api/scheduled-transactions/apply-due')
          .set('Authorization', `Bearer ${session.accessToken}`),
        `soak-sweep-${index}`,
      )
        .send({asOf: '2026-11-15'})
        .expect(200);
    }

    const ownerAccount = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId: account.publicId});
    expect(
      await database.dataSource.getRepository(MovementEntity).count({
        where: {accountId: ownerAccount.id},
      }),
    ).toBe(6);
    expect(ownerAccount.currentBalance).toBe(4_000);
    const detail = await e2e.http
      .get(`/api/scheduled-transactions/${schedulePublicId}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(200);
    expect((detail.body.data as {completedOccurrences: number}).completedOccurrences).toBe(6);
  });
});

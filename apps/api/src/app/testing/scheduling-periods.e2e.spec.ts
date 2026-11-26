import {AccountTypeEnum, ApiErrorCodeEnum, MovementTypeEnum, RecurrenceFrequencyEnum} from '@peco/enums';
import {AccountEntity, UserEntity} from '../database/entities';
import {authHeaders, registerE2eUser, withIdempotency} from './e2e-auth';
import {closeE2eApp, createE2eApp, type E2eTestApp} from './e2e-app';
import {createClosedPeriod} from './entity-factories';
import {
  resetTestDatabase,
  startTestDatabase,
  stopTestDatabase,
  type TestDatabase,
} from './test-database';

jest.setTimeout(180_000);

const NOW = '2026-11-15T12:00:00.000Z';

interface ScheduleSummary {
  readonly publicId: string;
  readonly anchorDate: string;
  readonly nextContemplatedDate: string;
  readonly nextExecutionDate: string;
  readonly completedOccurrences: number;
}

interface ApplyDueSummary {
  readonly applied: number;
  readonly skipped: number;
  readonly failed: number;
  readonly results: readonly {
    readonly contemplatedDate: string;
    readonly status: string;
    readonly reason: string | null;
    readonly movementPublicId: string | null;
  }[];
}

interface PeriodFigures {
  readonly period: string;
  readonly globalInitialBalance: number;
  readonly globalFinalBalance: number;
  readonly totalInflows: number;
  readonly totalOutflows: number;
  readonly totalTransactionsCount: number;
  readonly accountBalances: readonly {
    readonly accountPublicId: string;
    readonly initialBalance: number;
    readonly finalBalance: number;
    readonly totalInflows: number;
    readonly totalOutflows: number;
    readonly totalTransfers: number;
  }[];
}

describe('Scheduling and periods E2E (US-1103)', () => {
  let database: TestDatabase;
  let e2e: E2eTestApp;

  beforeAll(async () => {
    database = await startTestDatabase();
    e2e = await createE2eApp(database, NOW);
  });

  beforeEach(async () => {
    await resetTestDatabase(database.dataSource);
  });

  afterAll(async () => {
    await closeE2eApp(e2e);
    await stopTestDatabase(database);
  });

  const categoryIds = async (token: string): Promise<Record<string, string>> => {
    const response = await e2e.http
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = response.body.data as readonly {displayName: string; publicId: string}[];
    return Object.fromEntries(items.map((item) => [item.displayName, item.publicId]));
  };

  const createAccount = async (token: string, initialBalance: number): Promise<string> => {
    const response = await e2e.http
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({name: 'Cuenta de pruebas', type: AccountTypeEnum.CASH.toString(), initialBalance})
      .expect(201);
    return (response.body.data as {publicId: string}).publicId;
  };

  const backdateAccount = async (publicId: string, createdAt: string): Promise<void> => {
    await database.dataSource.query('UPDATE accounts SET createdAt = ? WHERE publicId = ?', [
      createdAt,
      publicId,
    ]);
  };

  const createSchedule = async (
    token: string,
    body: Record<string, unknown>,
  ): Promise<ScheduleSummary> => {
    const response = await e2e.http
      .post('/api/scheduled-transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(201);
    return response.body.data as ScheduleSummary;
  };

  const applyDue = async (token: string, asOf: string): Promise<ApplyDueSummary> => {
    const response = await withIdempotency(
      e2e.http
        .post('/api/scheduled-transactions/apply-due')
        .set('Authorization', `Bearer ${token}`),
      'apply-due',
    )
      .send({asOf})
      .expect(200);
    return response.body.data as ApplyDueSummary;
  };

  const createMovement = async (
    token: string,
    body: Record<string, unknown>,
  ): Promise<{publicId: string}> => {
    const response = await withIdempotency(
      e2e.http.post('/api/movements').set('Authorization', `Bearer ${token}`),
      'movement',
    )
      .send(body)
      .expect(201);
    return (response.body.data as {movement: {publicId: string}}).movement;
  };

  const closePeriod = async (token: string, period: string): Promise<void> => {
    await withIdempotency(
      e2e.http.post(`/api/periods/${period}/close`).set('Authorization', `Bearer ${token}`),
      'close-period',
    )
      .send({})
      .expect(201);
  };

  const readPeriod = async (token: string, period: string): Promise<PeriodFigures> => {
    const response = await e2e.http
      .get(`/api/periods/${period}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.data as PeriodFigures;
  };

  it('keeps a month-end anchor and moves weekend occurrences to Friday', async () => {
    const session = await registerE2eUser(e2e.http, 'month-end');
    const categories = await categoryIds(session.accessToken);
    const source = await createAccount(session.accessToken, 1_000_000);

    const schedule = await createSchedule(session.accessToken, {
      name: 'Renta mensual',
      estimatedAmount: 1_000,
      type: 'EXPENSE',
      categoryPublicId: categories['Servicios'],
      sourceAccountPublicId: source,
      frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
      anchorDate: '2026-01-31',
      autoApply: false,
      totalOccurrences: null,
      endDate: null,
    });

    expect(schedule).toMatchObject({
      anchorDate: '2026-01-31',
      nextContemplatedDate: '2026-01-31',
      nextExecutionDate: '2026-01-30',
      completedOccurrences: 0,
    });

    const executed = await withIdempotency(
      e2e.http
        .post(`/api/scheduled-transactions/${schedule.publicId}/execute`)
        .set('Authorization', `Bearer ${session.accessToken}`),
      'execute-month-end',
    )
      .send({})
      .expect(201);
    const data = executed.body.data as {
      occurrence: {contemplatedDate: string; occurrenceDate: string; status: string};
      schedule: ScheduleSummary;
    };

    expect(data.occurrence).toMatchObject({
      contemplatedDate: '2026-01-31',
      occurrenceDate: '2026-01-30',
      status: 'APPLIED',
    });
    // February 2026 ends on a Saturday, so its Friday applied date stays before the anchor.
    expect(data.schedule).toMatchObject({
      anchorDate: '2026-01-31',
      nextContemplatedDate: '2026-02-28',
      nextExecutionDate: '2026-02-27',
      completedOccurrences: 1,
    });

    const detail = await e2e.http
      .get(`/api/scheduled-transactions/${schedule.publicId}`)
      .set(authHeaders(session))
      .expect(200);
    expect((detail.body.data as ScheduleSummary).anchorDate).toBe('2026-01-31');
  });

  it('applies catch-up occurrences oldest first', async () => {
    const session = await registerE2eUser(e2e.http, 'catch-up-order');
    const categories = await categoryIds(session.accessToken);
    const source = await createAccount(session.accessToken, 1_000_000);

    await createSchedule(session.accessToken, {
      name: 'Diaria',
      estimatedAmount: 1_000,
      type: 'EXPENSE',
      categoryPublicId: categories['Servicios'],
      sourceAccountPublicId: source,
      frequency: RecurrenceFrequencyEnum.DAILY.toString(),
      anchorDate: '2026-11-20',
      autoApply: true,
      totalOccurrences: null,
      endDate: null,
    });

    const summary = await applyDue(session.accessToken, '2026-11-23');

    expect(summary).toMatchObject({applied: 4, skipped: 0, failed: 0});
    expect(summary.results.map((result) => result.contemplatedDate)).toEqual([
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
      '2026-11-23',
    ]);
    expect(summary.results.every((result) => result.status === 'APPLIED')).toBe(true);
  });

  it('skips closed-period occurrences and applies the open ones afterwards', async () => {
    const session = await registerE2eUser(e2e.http, 'catch-up-closed');
    const categories = await categoryIds(session.accessToken);
    const source = await createAccount(session.accessToken, 1_000_000);
    const user = await database.dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({publicId: session.userPublicId});
    await createClosedPeriod(database.dataSource, user, '2026-10');

    await createSchedule(session.accessToken, {
      name: 'Mensual con mes cerrado',
      estimatedAmount: 1_000,
      type: 'EXPENSE',
      categoryPublicId: categories['Servicios'],
      sourceAccountPublicId: source,
      frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
      anchorDate: '2026-10-01',
      autoApply: true,
      totalOccurrences: null,
      endDate: null,
    });

    const summary = await applyDue(session.accessToken, '2026-11-23');

    expect(summary).toMatchObject({applied: 1, skipped: 1, failed: 0});
    expect(summary.results).toEqual([
      expect.objectContaining({
        contemplatedDate: '2026-10-01',
        status: 'SKIPPED',
        reason: ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
        movementPublicId: null,
      }),
      expect.objectContaining({
        contemplatedDate: '2026-11-01',
        status: 'APPLIED',
        reason: null,
      }),
    ]);
    expect(
      await database.dataSource.getRepository(AccountEntity).findOneByOrFail({publicId: source}),
    ).toMatchObject({currentBalance: 999_000});
  });

  it('chains three closed months with the per-account balance identity', async () => {
    const session = await registerE2eUser(e2e.http, 'snapshot-chain');
    const categories = await categoryIds(session.accessToken);
    const source = await createAccount(session.accessToken, 100_000);
    await backdateAccount(source, '2026-04-01T00:00:00.000Z');

    for (const [date, amount, type, category] of [
      ['2026-04-10T12:00:00.000Z', 10_000, MovementTypeEnum.INCOME.toString(), 'Nómina'],
      ['2026-04-20T12:00:00.000Z', 2_000, MovementTypeEnum.EXPENSE.toString(), 'Servicios'],
      ['2026-05-10T12:00:00.000Z', 5_000, MovementTypeEnum.INCOME.toString(), 'Nómina'],
      ['2026-05-20T12:00:00.000Z', 1_000, MovementTypeEnum.EXPENSE.toString(), 'Servicios'],
      ['2026-06-10T12:00:00.000Z', 7_000, MovementTypeEnum.INCOME.toString(), 'Nómina'],
      ['2026-06-20T12:00:00.000Z', 500, MovementTypeEnum.EXPENSE.toString(), 'Servicios'],
    ] as const) {
      await createMovement(session.accessToken, {
        type,
        amount,
        date,
        accountPublicId: source,
        categoryPublicId: categories[category],
      });
    }

    for (const period of ['2026-04', '2026-05', '2026-06']) {
      await closePeriod(session.accessToken, period);
    }

    const snapshots = await Promise.all(
      ['2026-04', '2026-05', '2026-06'].map((period) => readPeriod(session.accessToken, period)),
    );

    expect(snapshots.map(({globalInitialBalance}) => globalInitialBalance)).toEqual([
      100_000, 108_000, 112_000,
    ]);
    expect(snapshots.map(({globalFinalBalance}) => globalFinalBalance)).toEqual([
      108_000, 112_000, 118_500,
    ]);
    expect(snapshots.map(({totalInflows}) => totalInflows)).toEqual([10_000, 5_000, 7_000]);
    expect(snapshots.map(({totalOutflows}) => totalOutflows)).toEqual([2_000, 1_000, 500]);
    expect(snapshots.map(({totalTransactionsCount}) => totalTransactionsCount)).toEqual([2, 2, 2]);

    for (let index = 0; index < snapshots.length; index += 1) {
      const snapshot = snapshots[index];
      if (index > 0) {
        expect(snapshot.globalInitialBalance).toBe(snapshots[index - 1].globalFinalBalance);
      }
      for (const balance of snapshot.accountBalances) {
        expect(balance.initialBalance + balance.totalInflows - balance.totalOutflows +
          balance.totalTransfers).toBe(balance.finalBalance);
      }
    }
  });

  it('returns the same frozen figures through the period and dashboard endpoints', async () => {
    const session = await registerE2eUser(e2e.http, 'frozen-parity');
    const categories = await categoryIds(session.accessToken);
    const source = await createAccount(session.accessToken, 100_000);
    await backdateAccount(source, '2026-04-01T00:00:00.000Z');
    await createMovement(session.accessToken, {
      type: MovementTypeEnum.INCOME.toString(),
      amount: 20_000,
      date: '2026-06-10T12:00:00.000Z',
      accountPublicId: source,
      categoryPublicId: categories['Nómina'],
    });
    await closePeriod(session.accessToken, '2026-06');

    const before = await readPeriod(session.accessToken, '2026-06');
    const dashboardBefore = await e2e.http
      .get('/api/reports/dashboard?period=2026-06')
      .set(authHeaders(session))
      .expect(200);
    const reportBefore = dashboardBefore.body.data as {
      status: string;
      totals: {totalIncome: number; totalExpenses: number; transactionCount: number};
      balances: {totalBalance: number};
    };

    expect(reportBefore.status).toBe('CLOSED');
    expect(reportBefore.totals).toMatchObject({
      totalIncome: before.totalInflows,
      totalExpenses: before.totalOutflows,
      transactionCount: before.totalTransactionsCount,
    });
    expect(reportBefore.balances.totalBalance).toBe(before.globalFinalBalance);

    const rejected = await withIdempotency(
      e2e.http.post('/api/movements').set('Authorization', `Bearer ${session.accessToken}`),
      'closed-write',
    )
      .send({
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 1_000,
        date: '2026-06-15T12:00:00.000Z',
        accountPublicId: source,
        categoryPublicId: categories['Servicios'],
      })
      .expect(409);
    expect(rejected.body.error.code).toBe(ApiErrorCodeEnum.PERIOD_CLOSED.toString());

    expect(await readPeriod(session.accessToken, '2026-06')).toEqual(before);
    const dashboardAfter = await e2e.http
      .get('/api/reports/dashboard?period=2026-06')
      .set(authHeaders(session))
      .expect(200);
    expect(dashboardAfter.body.data).toEqual(dashboardBefore.body.data);
  });
});

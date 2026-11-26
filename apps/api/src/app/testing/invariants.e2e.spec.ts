import {
  AccountTypeEnum,
  AlertRuleEnum,
  AlertSeverityEnum,
  ApiErrorCodeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ReportPeriodStatusEnum,
} from '@peco/enums';
import {AlertService} from '../common/observability/alert.service';
import {RECONCILIATION_ALERT_CODE} from '../jobs/reconciliation/constants/reconciliation-alert-code.constant';
import {RECONCILIATION_AUDIT_ENTITY} from '../jobs/reconciliation/constants/reconciliation-audit-entity.constant';
import {RECONCILIATION_MISMATCH_AUDIT_ACTION} from '../jobs/reconciliation/constants/reconciliation-audit-action.constant';
import {ReconciliationService} from '../jobs/reconciliation/services/reconciliation.service';
import {
  AccountEntity,
  AuditLogEntity,
  CategoryEntity,
  MovementEntity,
  ScheduledExecutionEntity,
  UserEntity,
} from '../database/entities';
import {
  authHeaders,
  type E2eSession,
  registerE2eUser,
  withIdempotency,
} from './e2e-auth';
import {closeE2eApp, createE2eApp, type E2eTestApp} from './e2e-app';
import {createMovement as createMovementRow} from './entity-factories';
import {
  resetTestDatabase,
  startTestDatabase,
  stopTestDatabase,
  type TestDatabase,
} from './test-database';

jest.setTimeout(180_000);

const NOW = '2026-11-15T12:00:00.000Z';

interface AccountLike {
  readonly publicId: string;
  readonly currentBalance: number;
  readonly isRoot: boolean;
  readonly version: number;
}

interface MovementLike {
  readonly publicId: string;
  readonly version: number;
  readonly amount: number;
  readonly type: string;
  readonly isReversed?: boolean;
  readonly isReversal?: boolean;
  readonly reversalOfPublicId?: string;
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

describe('Business invariants E2E (US-1105)', () => {
  let database: TestDatabase;
  let e2e: E2eTestApp;

  beforeAll(async () => {
    database = await startTestDatabase();
    e2e = await createE2eApp(database, NOW);
  });

  beforeEach(async () => {
    await resetTestDatabase(database.dataSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await closeE2eApp(e2e);
    await stopTestDatabase(database);
  });

  const auth = (session: E2eSession): Record<string, string> => authHeaders(session);

  const categories = async (token: string): Promise<Record<string, string>> => {
    const response = await e2e.http
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = response.body.data as readonly {displayName: string; publicId: string}[];
    return Object.fromEntries(items.map((item) => [item.displayName, item.publicId]));
  };

  const accounts = async (token: string): Promise<readonly AccountLike[]> => {
    const response = await e2e.http
      .get('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.data as readonly AccountLike[];
  };

  const userOf = async (publicId: string): Promise<UserEntity> =>
    database.dataSource.getRepository(UserEntity).findOneByOrFail({publicId});

  const categoryOf = async (publicId: string): Promise<CategoryEntity> =>
    database.dataSource.getRepository(CategoryEntity).findOneByOrFail({publicId});

  const createAccount = async (
    token: string,
    overrides: Record<string, unknown> = {},
  ): Promise<AccountLike> => {
    const response = await e2e.http
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Cuenta de invariantes',
        type: AccountTypeEnum.CASH.toString(),
        initialBalance: 0,
        ...overrides,
      })
      .expect(201);
    return response.body.data as AccountLike;
  };

  const createMovement = async (
    token: string,
    body: Record<string, unknown>,
    label = 'invariant',
  ): Promise<MovementLike> => {
    const response = await withIdempotency(
      e2e.http.post('/api/movements').set('Authorization', `Bearer ${token}`),
      label,
    )
      .send(body)
      .expect(201);
    return (response.body.data as {movement: MovementLike}).movement;
  };

  const movementRequest = (
    ids: Record<string, string>,
    accountPublicId: string,
    type: string,
    amount: number,
    date = '2026-11-10T12:00:00.000Z',
    targetAccountPublicId?: string,
  ): Record<string, unknown> => ({
    type,
    amount,
    date,
    accountPublicId,
    ...(targetAccountPublicId ? {targetAccountPublicId} : {}),
    categoryPublicId:
      type === MovementTypeEnum.TRANSFER.toString()
        ? ids['Transferencia']
        : type === MovementTypeEnum.INCOME.toString()
          ? ids['Nómina']
          : ids['Servicios'],
  });

  const storedBalance = async (publicId: string): Promise<number> => {
    const account = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId});
    return account.currentBalance;
  };

  const storedBalances = async (
    publicIds: readonly string[],
  ): Promise<Record<string, number>> => {
    const rows = await database.dataSource
      .getRepository(AccountEntity)
      .find({where: publicIds.map((publicId) => ({publicId}))});
    return Object.fromEntries(rows.map((row) => [row.publicId, row.currentBalance]));
  };

  const backdateAccount = async (publicId: string, createdAt: string): Promise<void> => {
    await database.dataSource.query('UPDATE accounts SET createdAt = ? WHERE publicId = ?', [
      createdAt,
      publicId,
    ]);
  };

  const closePeriod = async (token: string, period: string, label: string): Promise<void> => {
    await withIdempotency(
      e2e.http.post(`/api/periods/${period}/close`).set('Authorization', `Bearer ${token}`),
      label,
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

  const movementRows = async (publicId: string): Promise<MovementEntity | null> =>
    database.dataSource.getRepository(MovementEntity).findOne({
      where: {publicId},
      withDeleted: true,
    });

  it('stores every monetary value as integer cents', async () => {
    const session = await registerE2eUser(e2e.http, 'integer-cents');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 12345});
    const movement = await createMovement(
      session.accessToken,
      movementRequest(ids, account.publicId, MovementTypeEnum.INCOME.toString(), 6789),
    );
    const decimal = await withIdempotency(
      e2e.http.post('/api/movements').set(auth(session)),
      'decimal-amount',
    )
      .send(movementRequest(ids, account.publicId, MovementTypeEnum.INCOME.toString(), 12.34))
      .expect(400);

    const columns = (await database.dataSource.query(
      `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, DATA_TYPE AS dataType
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND ((TABLE_NAME = 'movements' AND COLUMN_NAME = 'amount')
           OR (TABLE_NAME = 'accounts' AND COLUMN_NAME IN ('initialBalance', 'currentBalance'))
           OR (TABLE_NAME = 'scheduledTransactions' AND COLUMN_NAME = 'estimatedAmount'))`,
    )) as readonly {tableName: string; columnName: string; dataType: string}[];

    expect(columns).toHaveLength(4);
    expect(columns.every(({dataType}) => dataType === 'bigint')).toBe(true);
    expect(await storedBalance(account.publicId)).toBe(19_134);
    expect((await movementRows(movement.publicId))?.amount).toBe(6789);
    expect(decimal.body.error.code).toBe(ApiErrorCodeEnum.VALIDATION_ERROR.toString());
  });

  it('requires positive magnitudes and derives direction from the movement type', async () => {
    const session = await registerE2eUser(e2e.http, 'positive-amounts');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 10_000});

    for (const amount of [0, -100]) {
      const response = await withIdempotency(
        e2e.http.post('/api/movements').set(auth(session)),
        `invalid-${amount}`,
      )
        .send(movementRequest(ids, account.publicId, MovementTypeEnum.EXPENSE.toString(), amount))
        .expect(400);
      expect(response.body.error.code).toBe(ApiErrorCodeEnum.VALIDATION_ERROR.toString());
    }

    const income = await createMovement(
      session.accessToken,
      movementRequest(ids, account.publicId, MovementTypeEnum.INCOME.toString(), 1_000),
      'income',
    );
    expect(await storedBalance(account.publicId)).toBe(11_000);
    expect((await movementRows(income.publicId))?.amount).toBe(1_000);

    const expense = await createMovement(
      session.accessToken,
      movementRequest(ids, account.publicId, MovementTypeEnum.EXPENSE.toString(), 1_000),
      'expense',
    );
    expect(await storedBalance(account.publicId)).toBe(10_000);
    expect((await movementRows(expense.publicId))?.amount).toBe(1_000);
  });

  it('allows negative balances only for credit accounts', async () => {
    const session = await registerE2eUser(e2e.http, 'credit-only-negative');
    const rejected = await e2e.http
      .post('/api/accounts')
      .set(auth(session))
      .send({name: 'Efectivo negativo', type: AccountTypeEnum.CASH.toString(), initialBalance: -1})
      .expect(400);
    expect(rejected.body.error.code).toBe(
      ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    );

    const credit = await createAccount(session.accessToken, {
      name: 'Tarjeta',
      type: AccountTypeEnum.CREDIT.toString(),
      initialBalance: -150_000,
      creditLimit: 500_000,
    });
    expect(await storedBalance(credit.publicId)).toBe(-150_000);
  });

  it('keeps exactly one protected root account per user', async () => {
    const session = await registerE2eUser(e2e.http, 'single-root');
    const before = await accounts(session.accessToken);
    const roots = before.filter(({isRoot}) => isRoot);
    expect(roots).toHaveLength(1);

    const rejected = await e2e.http
      .delete(`/api/accounts/${roots[0].publicId}`)
      .set(auth(session))
      .expect(409);
    expect(rejected.body.error.code).toBe(ApiErrorCodeEnum.ROOT_ACCOUNT_PROTECTED.toString());
    expect((await accounts(session.accessToken)).filter(({isRoot}) => isRoot)).toHaveLength(1);
  });

  it('preserves the balance identity across a deterministic random movement sequence', async () => {
    const session = await registerE2eUser(e2e.http, 'property-sequence');
    const ids = await categories(session.accessToken);
    const source = await createAccount(session.accessToken, {initialBalance: 100_000});
    const target = await createAccount(session.accessToken, {initialBalance: 0});
    const expected: Record<string, number> = {
      [source.publicId]: 100_000,
      [target.publicId]: 0,
    };
    const types = [
      MovementTypeEnum.INCOME.toString(),
      MovementTypeEnum.EXPENSE.toString(),
      MovementTypeEnum.TRANSFER.toString(),
    ];

    let seed = 123_456_789;
    const next = (): number => {
      seed = (seed * 1_664_525 + 1_013_904_223) >>> 0;
      return seed / 0x1_0000_0000;
    };

    for (let step = 0; step < 24; step += 1) {
      const amount = 100 + Math.floor(next() * 2_000);
      let type = types[Math.floor(next() * types.length)];
      if (type !== MovementTypeEnum.INCOME.toString() && amount > expected[source.publicId]) {
        type = MovementTypeEnum.INCOME.toString();
      }
      const targetId =
        type === MovementTypeEnum.TRANSFER.toString() ? target.publicId : undefined;
      await createMovement(
        session.accessToken,
        movementRequest(ids, source.publicId, type, amount, undefined, targetId),
        `sequence-${step}`,
      );

      expected[source.publicId] +=
        type === MovementTypeEnum.INCOME.toString() ? amount : -amount;
      if (targetId) {
        expected[target.publicId] += amount;
      }

      expect(await storedBalances([source.publicId, target.publicId])).toEqual(expected);
    }

    expect(Object.values(expected).every(Number.isInteger)).toBe(true);
  });

  it('mirrors reversals, locks both rows and rejects canceled mutations', async () => {
    const session = await registerE2eUser(e2e.http, 'reversal-rules');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 10_000});
    const original = await createMovement(
      session.accessToken,
      movementRequest(ids, account.publicId, MovementTypeEnum.INCOME.toString(), 4_000),
      'original',
    );

    const reverted = await withIdempotency(
      e2e.http
        .post(`/api/movements/${original.publicId}/revert`)
        .set(auth(session)),
      'reversal',
    )
      .expect(201);
    const data = reverted.body.data as {
      original: {isReversed: boolean};
      reversal: MovementLike;
    };
    expect(data.original.isReversed).toBe(true);
    expect(data.reversal).toMatchObject({
      isReversal: true,
      type: MovementTypeEnum.EXPENSE.toString(),
      reversalOfPublicId: original.publicId,
    });
    expect(await storedBalance(account.publicId)).toBe(10_000);

    for (const publicId of [original.publicId, data.reversal.publicId]) {
      const locked = await withIdempotency(
        e2e.http.patch(`/api/movements/${publicId}`).set(auth(session)),
        `locked-${publicId}`,
      )
        .send({amount: 5_000, version: 0})
        .expect(409);
      expect(locked.body.error.code).toBe(ApiErrorCodeEnum.MOVEMENT_LOCKED.toString());
    }

    const user = await userOf(session.userPublicId);
    const category = await categoryOf(ids['Servicios']);
    const canceled = await createMovementRow(
      database.dataSource,
      user,
      await database.dataSource.getRepository(AccountEntity).findOneByOrFail({publicId: account.publicId}),
      category,
      {isCanceled: true, type: MovementTypeEnum.INCOME.toString(), amount: 9_000},
    );
    const canceledRevert = await withIdempotency(
      e2e.http.post(`/api/movements/${canceled.publicId}/revert`).set(auth(session)),
      'canceled-revert',
    )
      .expect(409);
    expect(canceledRevert.body.error.code).toBe(ApiErrorCodeEnum.MOVEMENT_LOCKED.toString());
    const canceledEdit = await withIdempotency(
      e2e.http.patch(`/api/movements/${canceled.publicId}`).set(auth(session)),
      'canceled-edit',
    )
      .send({amount: 1_000, version: 0})
      .expect(409);
    expect(canceledEdit.body.error.code).toBe(ApiErrorCodeEnum.MOVEMENT_LOCKED.toString());
    expect(await storedBalance(account.publicId)).toBe(10_000);
  });

  it('excludes canceled movements from balances and closed-period figures', async () => {
    const session = await registerE2eUser(e2e.http, 'canceled-neutral');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 0});
    await backdateAccount(account.publicId, '2026-04-01T00:00:00.000Z');
    await createMovement(
      session.accessToken,
      movementRequest(
        ids,
        account.publicId,
        MovementTypeEnum.INCOME.toString(),
        1_000,
        '2026-04-10T12:00:00.000Z',
      ),
      'active',
    );

    const user = await userOf(session.userPublicId);
    const row = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId: account.publicId});
    await createMovementRow(
      database.dataSource,
      user,
      row,
      await categoryOf(ids['Servicios']),
      {
        isCanceled: true,
        type: MovementTypeEnum.INCOME.toString(),
        amount: 9_000,
        date: '2026-04-11T12:00:00.000Z',
      },
    );

    await closePeriod(session.accessToken, '2026-04', 'canceled-close');
    const snapshot = await readPeriod(session.accessToken, '2026-04');

    expect(snapshot).toMatchObject({
      totalInflows: 1_000,
      totalOutflows: 0,
      totalTransactionsCount: 1,
      globalFinalBalance: 1_000,
    });
    expect(await storedBalance(account.publicId)).toBe(1_000);
  });

  it('rejects writes inside a closed period without recomputing its snapshot', async () => {
    const session = await registerE2eUser(e2e.http, 'closed-immutable');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 5_000});
    await backdateAccount(account.publicId, '2026-04-01T00:00:00.000Z');
    const movement = await createMovement(
      session.accessToken,
      movementRequest(
        ids,
        account.publicId,
        MovementTypeEnum.INCOME.toString(),
        1_000,
        '2026-04-10T12:00:00.000Z',
      ),
      'before-close',
    );
    await closePeriod(session.accessToken, '2026-04', 'immutable-close');
    const before = await readPeriod(session.accessToken, '2026-04');

    const blockedCreate = await withIdempotency(
      e2e.http.post('/api/movements').set(auth(session)),
      'blocked-create',
    )
      .send(
        movementRequest(
          ids,
          account.publicId,
          MovementTypeEnum.EXPENSE.toString(),
          100,
          '2026-04-11T12:00:00.000Z',
        ),
      )
      .expect(409);
    const blockedEdit = await withIdempotency(
      e2e.http.patch(`/api/movements/${movement.publicId}`).set(auth(session)),
      'blocked-edit',
    )
      .send({amount: 2_000, version: movement.version})
      .expect(409);
    const blockedDelete = await e2e.http
      .delete(`/api/movements/${movement.publicId}`)
      .set(auth(session))
      .expect(409);

    for (const response of [blockedCreate, blockedEdit, blockedDelete]) {
      expect(response.body.error.code).toBe(ApiErrorCodeEnum.PERIOD_CLOSED.toString());
    }
    expect(await readPeriod(session.accessToken, '2026-04')).toEqual(before);
    expect(await storedBalance(account.publicId)).toBe(6_000);
  });

  it('closes months sequentially and anchors each snapshot to the previous final balance', async () => {
    const session = await registerE2eUser(e2e.http, 'sequential-close');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 100_000});
    await backdateAccount(account.publicId, '2026-04-01T00:00:00.000Z');

    await createMovement(
      session.accessToken,
      movementRequest(
        ids,
        account.publicId,
        MovementTypeEnum.INCOME.toString(),
        10_000,
        '2026-04-10T12:00:00.000Z',
      ),
      'april',
    );
    await createMovement(
      session.accessToken,
      movementRequest(
        ids,
        account.publicId,
        MovementTypeEnum.INCOME.toString(),
        5_000,
        '2026-05-10T12:00:00.000Z',
      ),
      'may',
    );
    await closePeriod(session.accessToken, '2026-04', 'close-april');
    await closePeriod(session.accessToken, '2026-05', 'close-may');

    const april = await readPeriod(session.accessToken, '2026-04');
    const may = await readPeriod(session.accessToken, '2026-05');
    expect(april).toMatchObject({globalInitialBalance: 100_000, globalFinalBalance: 110_000});
    expect(may).toMatchObject({globalInitialBalance: 110_000, globalFinalBalance: 115_000});
    for (const snapshot of [april, may]) {
      for (const balance of snapshot.accountBalances) {
        expect(
          balance.initialBalance +
            balance.totalInflows -
            balance.totalOutflows +
            balance.totalTransfers,
        ).toBe(balance.finalBalance);
      }
    }
  });

  it('protects system categories and aggregates deleted-category history into the root', async () => {
    const session = await registerE2eUser(e2e.http, 'category-invariants');
    const ids = await categories(session.accessToken);
    for (const name of ['Otros', 'Transferencia']) {
      const response = await e2e.http
        .patch(`/api/categories/${ids[name]}`)
        .set(auth(session))
        .send({displayName: 'Modificada'})
        .expect(409);
      expect(response.body.error.code).toBe(
        ApiErrorCodeEnum.CATEGORY_SYSTEM_PROTECTED.toString(),
      );
    }

    const created = await e2e.http
      .post('/api/categories')
      .set(auth(session))
      .send({displayName: 'Temporal', applyType: CategoryApplyTypeEnum.EXPENSE.toString()})
      .expect(201);
    const temporaryPublicId = (created.body.data as {publicId: string}).publicId;
    const account = await createAccount(session.accessToken, {initialBalance: 5_000});
    await createMovement(
      session.accessToken,
      {
        ...movementRequest(
          ids,
          account.publicId,
          MovementTypeEnum.EXPENSE.toString(),
          1_000,
        ),
        categoryPublicId: temporaryPublicId,
      },
      'temporary-category',
    );
    await database.dataSource.query('UPDATE categories SET deletedAt = ? WHERE publicId = ?', [
      NOW,
      temporaryPublicId,
    ]);

    const distribution = await e2e.http
      .get('/api/reports/categories/distribution?period=2026-11&type=EXPENSE')
      .set(auth(session))
      .expect(200);
    const report = distribution.body.data as {
      total: number;
      items: readonly {categoryPublicId: string; amount: number}[];
    };
    expect(report.total).toBe(1_000);
    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({
      categoryPublicId: ids['Otros'],
      amount: 1_000,
      displayName: 'Otros',
    });
  });

  it('transfers the balance to the root account before deleting an account', async () => {
    const session = await registerE2eUser(e2e.http, 'account-deletion');
    const root = (await accounts(session.accessToken)).find(({isRoot}) => isRoot);
    if (!root) {
      throw new Error('Missing root account');
    }
    const account = await createAccount(session.accessToken, {initialBalance: 5_000});

    await e2e.http
      .delete(`/api/accounts/${account.publicId}?transferToPublicId=${root.publicId}`)
      .set(auth(session))
      .expect(200);

    const after = await accounts(session.accessToken);
    expect(after.find(({publicId}) => publicId === root.publicId)?.currentBalance).toBe(
      root.currentBalance + 5_000,
    );
    expect(after.some(({publicId}) => publicId === account.publicId)).toBe(false);
    const stored = await database.dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId: account.publicId}, withDeleted: true});
    expect(stored?.deletedAt).toBeTruthy();
  });

  it('applies a scheduled occurrence only once across a replayed execution', async () => {
    const session = await registerE2eUser(e2e.http, 'schedule-once');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 10_000});
    const created = await e2e.http
      .post('/api/scheduled-transactions')
      .set(auth(session))
      .send({
        name: 'Diaria',
        estimatedAmount: 2_000,
        type: MovementTypeEnum.EXPENSE.toString(),
        categoryPublicId: ids['Servicios'],
        sourceAccountPublicId: account.publicId,
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        anchorDate: '2026-11-10',
        autoApply: false,
        totalOccurrences: null,
        endDate: null,
      })
      .expect(201);
    const schedulePublicId = (created.body.data as {publicId: string}).publicId;
    const key = `schedule-once-${schedulePublicId}`;

    const first = await e2e.http
      .post(`/api/scheduled-transactions/${schedulePublicId}/execute`)
      .set(auth(session))
      .set('Idempotency-Key', key)
      .send({})
      .expect(201);
    const replay = await e2e.http
      .post(`/api/scheduled-transactions/${schedulePublicId}/execute`)
      .set(auth(session))
      .set('Idempotency-Key', key)
      .send({})
      .expect(201);

    const accountRow = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId: account.publicId});

    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data).toEqual(first.body.data);
    expect(await database.dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
    expect(
      await database.dataSource.getRepository(MovementEntity).count({
        where: {accountId: accountRow.id},
      }),
    ).toBe(1);
    expect(await storedBalance(account.publicId)).toBe(8_000);
  });

  it('resolves due detection and report status from the UTC clock', async () => {
    const session = await registerE2eUser(e2e.http, 'utc-everywhere');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 10_000});
    await e2e.http
      .post('/api/scheduled-transactions')
      .set(auth(session))
      .send({
        name: 'Mensual UTC',
        estimatedAmount: 1_000,
        type: MovementTypeEnum.EXPENSE.toString(),
        categoryPublicId: ids['Servicios'],
        sourceAccountPublicId: account.publicId,
        frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
        anchorDate: '2026-11-15',
        autoApply: true,
        totalOccurrences: null,
        endDate: null,
      })
      .expect(201);

    const due = await withIdempotency(
      e2e.http.post('/api/scheduled-transactions/apply-due').set(auth(session)),
      'utc-due',
    )
      .send({})
      .expect(200);
    const summary = due.body.data as {
      applied: number;
      results: readonly {contemplatedDate: string; status: string}[];
    };
    expect(summary.applied).toBe(1);
    expect(summary.results[0]).toMatchObject({
      contemplatedDate: '2026-11-15',
      status: 'APPLIED',
    });

    for (const [period, status] of [
      ['2026-10', ReportPeriodStatusEnum.CLOSED.toString()],
      ['2026-11', ReportPeriodStatusEnum.CURRENT.toString()],
      ['2026-12', ReportPeriodStatusEnum.FUTURE.toString()],
    ] as const) {
      const response = await e2e.http
        .get(`/api/reports/dashboard?period=${period}`)
        .set(auth(session))
        .expect(200);
      expect((response.body.data as {status: string}).status).toBe(status);
    }
  });

  it('stores the exact UTC timestamp and derives period membership from its date part', async () => {
    const session = await registerE2eUser(e2e.http, 'timestamp-date');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 0});
    await backdateAccount(account.publicId, '2026-04-01T00:00:00.000Z');
    const exactDate = '2026-04-30T23:59:59.999Z';
    const movement = await createMovement(
      session.accessToken,
      movementRequest(
        ids,
        account.publicId,
        MovementTypeEnum.INCOME.toString(),
        1_234,
        exactDate,
      ),
      'exact-timestamp',
    );
    await closePeriod(session.accessToken, '2026-04', 'timestamp-close');

    expect((await movementRows(movement.publicId))?.date).toBe(exactDate);
    expect(await readPeriod(session.accessToken, '2026-04')).toMatchObject({
      period: '2026-04',
      totalTransactionsCount: 1,
      globalFinalBalance: 1_234,
    });
  });

  it('replaces a movement when its type changes instead of mutating it', async () => {
    const session = await registerE2eUser(e2e.http, 'type-replacement');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 10_000});
    const original = await createMovement(
      session.accessToken,
      movementRequest(ids, account.publicId, MovementTypeEnum.EXPENSE.toString(), 3_000),
      'replace-original',
    );

    const response = await withIdempotency(
      e2e.http.patch(`/api/movements/${original.publicId}`).set(auth(session)),
      'type-replace',
    )
      .send({
        type: MovementTypeEnum.INCOME.toString(),
        categoryPublicId: ids['Nómina'],
        version: original.version,
      })
      .expect(200);
    const data = response.body.data as {
      replacedPublicId: string;
      movement: MovementLike;
    };
    expect(data.replacedPublicId).toBe(original.publicId);

    const storedOriginal = await movementRows(original.publicId);
    const storedReplacement = await movementRows(data.movement.publicId);
    expect(storedOriginal?.deletedAt).toBeTruthy();
    expect(storedOriginal?.version).toBe(original.version + 1);
    expect(storedReplacement?.replacesMovementId).toBe(storedOriginal?.id);
    expect(storedReplacement?.type).toBe(MovementTypeEnum.INCOME.toString());
    expect(await storedBalance(account.publicId)).toBe(13_000);
  });

  it('moves month-end schedules to the previous business day while keeping the anchor', async () => {
    const session = await registerE2eUser(e2e.http, 'month-end-invariant');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 10_000});
    const created = await e2e.http
      .post('/api/scheduled-transactions')
      .set(auth(session))
      .send({
        name: 'Fin de mes',
        estimatedAmount: 1_000,
        type: MovementTypeEnum.EXPENSE.toString(),
        categoryPublicId: ids['Servicios'],
        sourceAccountPublicId: account.publicId,
        frequency: RecurrenceFrequencyEnum.MONTHLY.toString(),
        anchorDate: '2026-01-31',
        autoApply: false,
        totalOccurrences: null,
        endDate: null,
      })
      .expect(201);
    const schedulePublicId = (created.body.data as {publicId: string}).publicId;

    const executed = await withIdempotency(
      e2e.http
        .post(`/api/scheduled-transactions/${schedulePublicId}/execute`)
        .set(auth(session)),
      'month-end-execute',
    )
      .send({})
      .expect(201);
    const data = executed.body.data as {
      occurrence: {contemplatedDate: string; occurrenceDate: string};
      schedule: {anchorDate: string; nextContemplatedDate: string; nextExecutionDate: string};
    };
    expect(data.occurrence).toMatchObject({
      contemplatedDate: '2026-01-31',
      occurrenceDate: '2026-01-30',
    });
    expect(data.schedule).toMatchObject({
      anchorDate: '2026-01-31',
      nextContemplatedDate: '2026-02-28',
      nextExecutionDate: '2026-02-27',
    });
  });

  it('keeps snapshots gross and derives availability from frozen account metadata', async () => {
    const session = await registerE2eUser(e2e.http, 'gross-snapshots');
    const excluded = await createAccount(session.accessToken, {
      name: 'Excluida',
      initialBalance: 100_000,
      includeInTotal: false,
    });
    const credit = await createAccount(session.accessToken, {
      name: 'Tarjeta',
      type: AccountTypeEnum.CREDIT.toString(),
      initialBalance: -150_000,
      creditLimit: 500_000,
    });
    await backdateAccount(excluded.publicId, '2026-04-01T00:00:00.000Z');
    await backdateAccount(credit.publicId, '2026-04-01T00:00:00.000Z');
    const ids = await categories(session.accessToken);
    await createMovement(
      session.accessToken,
      movementRequest(
        ids,
        excluded.publicId,
        MovementTypeEnum.INCOME.toString(),
        1_000,
        '2026-04-10T12:00:00.000Z',
      ),
      'gross-activity',
    );
    await closePeriod(session.accessToken, '2026-04', 'gross-close');

    const response = await e2e.http
      .get('/api/reports/dashboard?period=2026-04')
      .set(auth(session))
      .expect(200);
    const report = response.body.data as {
      balances: {totalBalance: number; availableBalance: number; liabilitiesBalance: number};
    };
    expect(report.balances).toEqual({
      totalBalance: -49_000,
      availableBalance: 0,
      liabilitiesBalance: 150_000,
    });
    expect(await readPeriod(session.accessToken, '2026-04')).toMatchObject({
      globalFinalBalance: -49_000,
    });
  });

  it('detects injected reconciliation drift without correcting it', async () => {
    const session = await registerE2eUser(e2e.http, 'reconciliation-drift');
    const ids = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, {initialBalance: 100_000});
    await createMovement(
      session.accessToken,
      movementRequest(ids, account.publicId, MovementTypeEnum.INCOME.toString(), 5_000),
      'reconciliation-ledger',
    );
    const expectedBalance = 105_000;
    const driftedBalance = expectedBalance + 777;

    await database.dataSource.query(
      'UPDATE accounts SET currentBalance = ? WHERE publicId = ?',
      [driftedBalance, account.publicId],
    );
    await database.dataSource.query(
      'UPDATE users SET lastActiveAt = ? WHERE publicId = ?',
      [NOW, session.userPublicId],
    );
    const raise = jest.spyOn(e2e.app.get(AlertService), 'raise');

    const result = await e2e.app.get(ReconciliationService).reconcile();
    expect(result).toMatchObject({acquired: true, mismatches: 1});
    expect(result.scannedAccounts).toBeGreaterThanOrEqual(1);
    expect(raise).toHaveBeenCalledWith(
      AlertRuleEnum.RECONCILIATION_DRIFT.toString(),
      AlertSeverityEnum.PAGE.toString(),
      expect.objectContaining({
        code: RECONCILIATION_ALERT_CODE,
        expectedBalance,
        currentBalance: driftedBalance,
        delta: -777,
      }),
    );

    const owner = await userOf(session.userPublicId);
    const audit = await database.dataSource.getRepository(AuditLogEntity).find({
      where: {
        userId: owner.id,
        action: RECONCILIATION_MISMATCH_AUDIT_ACTION,
        entity: RECONCILIATION_AUDIT_ENTITY,
      },
    });
    expect(audit).toHaveLength(1);
    expect(await storedBalance(account.publicId)).toBe(driftedBalance);
  });
});

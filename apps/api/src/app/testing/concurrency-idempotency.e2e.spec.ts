import {RecurrenceFrequencyEnum} from '@peco/enums';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  UserEntity,
} from '../database/entities';
import {nextIdempotencyKey, registerE2eUser, withIdempotency} from './e2e-auth';
import {closeE2eApp, createE2eApp, type E2eTestApp} from './e2e-app';
import {
  resetTestDatabase,
  startTestDatabase,
  stopTestDatabase,
  type TestDatabase,
} from './test-database';

jest.setTimeout(180_000);

const NOW = '2026-11-15T12:00:00.000Z';

interface AccountResponse {
  readonly publicId: string;
  readonly currentBalance: number;
}

interface PeriodFigures {
  readonly globalFinalBalance: number;
  readonly totalTransactionsCount: number;
}

describe('Concurrency and idempotency E2E (US-1104)', () => {
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

  const createAccount = async (token: string, initialBalance: number): Promise<AccountResponse> => {
    const response = await e2e.http
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({name: 'Cuenta concurrente', type: 'CASH', initialBalance})
      .expect(201);
    return response.body.data as AccountResponse;
  };

  const backdateAccount = async (publicId: string, createdAt: string): Promise<void> => {
    await database.dataSource.query('UPDATE accounts SET createdAt = ? WHERE publicId = ?', [
      createdAt,
      publicId,
    ]);
  };

  const movementBody = (
    accountPublicId: string,
    categoryPublicId: string,
    date: string,
    amount: number,
    type = 'INCOME',
  ): Record<string, unknown> => ({
    type,
    amount,
    date,
    accountPublicId,
    categoryPublicId,
  });

  const storedBalance = async (publicId: string): Promise<number> => {
    const account = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId});
    return account.currentBalance;
  };

  const accountId = async (publicId: string): Promise<number> => {
    const account = await database.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({publicId});
    return account.id;
  };

  const userId = async (publicId: string): Promise<number> => {
    const user = await database.dataSource
      .getRepository(UserEntity)
      .findOneByOrFail({publicId});
    return user.id;
  };

  const readPeriod = async (token: string, period: string): Promise<PeriodFigures> => {
    const response = await e2e.http
      .get(`/api/periods/${period}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return response.body.data as PeriodFigures;
  };

  it('converges parallel movement writes to the exact sum', async () => {
    const session = await registerE2eUser(e2e.http, 'parallel-writes');
    const categories = await categoryIds(session.accessToken);
    const account = await createAccount(session.accessToken, 0);

    const responses = await Promise.all(
      Array.from({length: 12}, (_, index) =>
        withIdempotency(
          e2e.http
            .post('/api/movements')
            .set('Authorization', `Bearer ${session.accessToken}`),
          `parallel-${index}`,
        ).send(
          movementBody(
            account.publicId,
            categories['Nómina'],
            '2026-11-10T12:00:00.000Z',
            1_000,
          ),
        ),
      ),
    );

    expect(responses.map(({status}) => status)).toEqual(Array.from({length: 12}, () => 201));
    expect(await storedBalance(account.publicId)).toBe(12_000);
    expect(
      await database.dataSource.getRepository(MovementEntity).count({
        where: {accountId: (await accountId(account.publicId))},
      }),
    ).toBe(12);
  });

  it('never leaves a backdated movement after the closing snapshot', async () => {
    const session = await registerE2eUser(e2e.http, 'backdated-race');
    const categories = await categoryIds(session.accessToken);
    const account = await createAccount(session.accessToken, 10_000);
    await backdateAccount(account.publicId, '2026-10-01T00:00:00.000Z');

    const seeded = await withIdempotency(
      e2e.http.post('/api/movements').set('Authorization', `Bearer ${session.accessToken}`),
      'seed-activity',
    )
      .send(
        movementBody(
          account.publicId,
          categories['Nómina'],
          '2026-10-02T12:00:00.000Z',
          1_000,
        ),
      )
      .expect(201);
    expect(seeded.status).toBe(201);

    const [closeResponse, writeResponse] = await Promise.all([
      withIdempotency(
        e2e.http
          .post('/api/periods/2026-10/close')
          .set('Authorization', `Bearer ${session.accessToken}`),
        'race-close',
      ).send({}),
      withIdempotency(
        e2e.http.post('/api/movements').set('Authorization', `Bearer ${session.accessToken}`),
        'race-write',
      ).send(
        movementBody(
          account.publicId,
          categories['Servicios'],
          '2026-10-05T12:00:00.000Z',
          500,
          'EXPENSE',
        ),
      ),
    ]);

    const snapshot = await readPeriod(session.accessToken, '2026-10');
    if (writeResponse.status === 201) {
      expect(closeResponse.status).toBe(201);
      expect(snapshot).toMatchObject({globalFinalBalance: 10_500, totalTransactionsCount: 2});
    } else {
      expect(writeResponse.status).toBe(409);
      expect(writeResponse.body.error.code).toBe('PERIOD_CLOSED');
      expect(snapshot).toMatchObject({globalFinalBalance: 11_000, totalTransactionsCount: 1});
    }
    expect(await storedBalance(account.publicId)).toBe(snapshot.globalFinalBalance);
  });

  it('returns 201 then 200 for two concurrent closes with a single snapshot', async () => {
    const session = await registerE2eUser(e2e.http, 'concurrent-close');
    const categories = await categoryIds(session.accessToken);
    const account = await createAccount(session.accessToken, 10_000);
    await backdateAccount(account.publicId, '2026-10-01T00:00:00.000Z');
    await withIdempotency(
      e2e.http.post('/api/movements').set('Authorization', `Bearer ${session.accessToken}`),
      'close-activity',
    )
      .send(
        movementBody(
          account.publicId,
          categories['Nómina'],
          '2026-10-02T12:00:00.000Z',
          1_000,
        ),
      )
      .expect(201);

    const responses = await Promise.all([
      withIdempotency(
        e2e.http
          .post('/api/periods/2026-10/close')
          .set('Authorization', `Bearer ${session.accessToken}`),
        'close-first',
      ).send({}),
      withIdempotency(
        e2e.http
          .post('/api/periods/2026-10/close')
          .set('Authorization', `Bearer ${session.accessToken}`),
        'close-second',
      ).send({}),
    ]);

    expect(responses.map(({status}) => status).sort()).toEqual([200, 201]);
    const ownerId = await userId(session.userPublicId);
    expect(
      await database.dataSource
        .getRepository(PeriodSnapshotEntity)
        .count({where: {userId: ownerId, period: '2026-10'}}),
    ).toBe(1);
    expect(await database.dataSource.getRepository(AccountPeriodBalanceEntity).count()).toBe(1);
  });

  it('replays the same idempotency key without applying a movement twice', async () => {
    const session = await registerE2eUser(e2e.http, 'replay-write');
    const categories = await categoryIds(session.accessToken);
    const account = await createAccount(session.accessToken, 0);
    const body = movementBody(
      account.publicId,
      categories['Nómina'],
      '2026-11-10T12:00:00.000Z',
      1_000,
    );
    const key = nextIdempotencyKey('replay-movement');

    const first = await e2e.http
      .post('/api/movements')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);
    const replay = await e2e.http
      .post('/api/movements')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('Idempotency-Key', key)
      .send(body)
      .expect(201);

    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data).toEqual(first.body.data);
    expect(
      await database.dataSource.getRepository(MovementEntity).count({
        where: {accountId: await accountId(account.publicId)},
      }),
    ).toBe(1);
    expect(await storedBalance(account.publicId)).toBe(1_000);
  });

  it('replays a schedule execution without applying the occurrence twice', async () => {
    const session = await registerE2eUser(e2e.http, 'replay-execution');
    const categories = await categoryIds(session.accessToken);
    const account = await createAccount(session.accessToken, 10_000);

    const created = await e2e.http
      .post('/api/scheduled-transactions')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        name: 'Diaria',
        estimatedAmount: 2_000,
        type: 'EXPENSE',
        categoryPublicId: categories['Servicios'],
        sourceAccountPublicId: account.publicId,
        frequency: RecurrenceFrequencyEnum.DAILY.toString(),
        anchorDate: '2026-11-10',
        autoApply: true,
        totalOccurrences: null,
        endDate: null,
      })
      .expect(201);
    const schedulePublicId = (created.body.data as {publicId: string}).publicId;
    const key = nextIdempotencyKey('replay-execution');

    const first = await e2e.http
      .post(`/api/scheduled-transactions/${schedulePublicId}/execute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('Idempotency-Key', key)
      .send({})
      .expect(201);
    const replay = await e2e.http
      .post(`/api/scheduled-transactions/${schedulePublicId}/execute`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .set('Idempotency-Key', key)
      .send({})
      .expect(201);

    expect(replay.headers['idempotency-replayed']).toBe('true');
    expect(replay.body.data).toEqual(first.body.data);
    expect(await database.dataSource.getRepository(ScheduledExecutionEntity).count()).toBe(1);
    expect(
      await database.dataSource.getRepository(MovementEntity).count({
        where: {accountId: await accountId(account.publicId)},
      }),
    ).toBe(1);
    expect(await storedBalance(account.publicId)).toBe(8_000);
  });
});

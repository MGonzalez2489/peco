import type {AccountType} from '@peco/contracts';
import {AccountTypeEnum, AuditActionEnum, MovementTypeEnum} from '@peco/enums';
import {AccountEntity, AuditLogEntity, MovementEntity, UserEntity} from '../database/entities';
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

const NOW = '2026-04-15T12:00:00.000Z';

interface CreatedAccount {
  readonly publicId: string;
  readonly currentBalance: number;
  readonly version: number;
}

interface CreatedMovement {
  readonly publicId: string;
  readonly version: number;
  readonly amount: number;
}

interface MutationResult {
  readonly movement: CreatedMovement;
  readonly balances: readonly {
    readonly accountPublicId: string;
    readonly currentBalance: number;
    readonly version: number;
  }[];
  readonly replacedPublicId?: string;
}

describe('Auth and ledger E2E (US-1102)', () => {
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

  const createAccount = async (
    token: string,
    name: string,
    type: AccountType = AccountTypeEnum.CASH.toString(),
    initialBalance = 0,
  ): Promise<CreatedAccount> => {
    const response = await e2e.http
      .post('/api/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({name, type, initialBalance})
      .expect(201);
    return response.body.data as CreatedAccount;
  };

  const categories = async (token: string): Promise<Record<string, string>> => {
    const response = await e2e.http
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = response.body.data as readonly {displayName: string; publicId: string}[];
    return Object.fromEntries(items.map((item) => [item.displayName, item.publicId]));
  };

  const createMovement = async (
    token: string,
    body: Record<string, unknown>,
  ): Promise<MutationResult> => {
    const response = await withIdempotency(
      e2e.http.post('/api/movements').set('Authorization', `Bearer ${token}`),
      'create-movement',
    )
      .send(body)
      .expect(201);
    return response.body.data as MutationResult;
  };

  const balanceOf = async (publicId: string): Promise<number> => {
    const account = await database.dataSource
      .getRepository(AccountEntity)
      .findOne({where: {publicId}});
    if (!account) {
      throw new Error(`Missing account ${publicId}`);
    }
    return account.currentBalance;
  };

  const userId = async (publicId: string): Promise<number> => {
    const user = await database.dataSource.getRepository(UserEntity).findOne({where: {publicId}});
    if (!user) {
      throw new Error(`Missing user ${publicId}`);
    }
    return user.id;
  };

  it('covers register → me → refresh → logout → refresh rejected over HTTP', async () => {
    const session = await registerE2eUser(e2e.http, 'auth-lifecycle');
    const headers = authHeaders(session);

    const exported = await e2e.http
      .get('/api/users/me/export')
      .set(headers)
      .expect(200);
    expect(exported.body.data.user).toMatchObject({
      publicId: session.userPublicId,
      email: session.email,
    });

    const accounts = await e2e.http.get('/api/accounts').set(headers).expect(200);
    expect(accounts.body.data).toEqual([
      expect.objectContaining({isRoot: true, name: 'Efectivo', currentBalance: 0}),
    ]);

    const refreshed = await e2e.http
      .post('/api/auth/refresh')
      .send({refreshToken: session.refreshToken})
      .expect(200);
    const rotated = refreshed.body.data as {
      accessToken: string;
      refreshToken: string;
      user: {publicId: string};
    };
    expect(rotated.user.publicId).toBe(session.userPublicId);
    // The fixed clock yields identical JWTs for identical claims within one second.
    expect(rotated.accessToken).toEqual(expect.any(String));
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    await e2e.http
      .get('/api/accounts')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .expect(200);

    await e2e.http
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${rotated.accessToken}`)
      .send({refreshToken: rotated.refreshToken})
      .expect(204);

    const rejected = await e2e.http
      .post('/api/auth/refresh')
      .send({refreshToken: rotated.refreshToken})
      .expect(401);
    expect(rejected.body.error.code).toBe('REFRESH_TOKEN_REUSED');
  });

  it('keeps balances and the audit trail correct across the movement lifecycle', async () => {
    const session = await registerE2eUser(e2e.http, 'ledger-lifecycle');
    const headers = authHeaders(session);
    const categoryIds = await categories(session.accessToken);
    const source = await createAccount(session.accessToken, 'Cuenta origen');
    const target = await createAccount(session.accessToken, 'Cuenta destino');

    const income = await createMovement(session.accessToken, {
      type: MovementTypeEnum.INCOME.toString(),
      amount: 10_000,
      date: '2026-04-10T12:00:00.000Z',
      accountPublicId: source.publicId,
      categoryPublicId: categoryIds['Nómina'],
    });
    expect(income.balances).toEqual([
      expect.objectContaining({accountPublicId: source.publicId, currentBalance: 10_000}),
    ]);

    const expense = await createMovement(session.accessToken, {
      type: MovementTypeEnum.EXPENSE.toString(),
      amount: 3_000,
      date: '2026-04-11T12:00:00.000Z',
      accountPublicId: source.publicId,
      categoryPublicId: categoryIds['Servicios'],
    });
    expect(expense.balances).toEqual([
      expect.objectContaining({accountPublicId: source.publicId, currentBalance: 7_000}),
    ]);

    const transfer = await createMovement(session.accessToken, {
      type: MovementTypeEnum.TRANSFER.toString(),
      amount: 2_000,
      date: '2026-04-12T12:00:00.000Z',
      accountPublicId: source.publicId,
      targetAccountPublicId: target.publicId,
      categoryPublicId: categoryIds['Transferencia'],
    });
    expect(transfer.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({accountPublicId: source.publicId, currentBalance: 5_000}),
        expect.objectContaining({accountPublicId: target.publicId, currentBalance: 2_000}),
      ]),
    );

    const edited = await withIdempotency(
      e2e.http
        .patch(`/api/movements/${expense.movement.publicId}`)
        .set(headers)
        .send({amount: 5_000, version: expense.movement.version}),
      'edit-movement',
    ).expect(200);
    const editedData = edited.body.data as MutationResult;
    expect(editedData.balances).toEqual([
      expect.objectContaining({accountPublicId: source.publicId, currentBalance: 3_000}),
    ]);

    const replaced = await withIdempotency(
      e2e.http
        .patch(`/api/movements/${expense.movement.publicId}`)
        .set(headers)
        .send({
          type: MovementTypeEnum.INCOME.toString(),
          categoryPublicId: categoryIds['Nómina'],
          version: editedData.movement.version,
        }),
      'replace-movement',
    ).expect(200);
    const replacedData = replaced.body.data as MutationResult;
    expect(replacedData.replacedPublicId).toBe(expense.movement.publicId);
    expect(replacedData.balances).toEqual([
      expect.objectContaining({accountPublicId: source.publicId, currentBalance: 13_000}),
    ]);

    const reverted = await withIdempotency(
      e2e.http.post(`/api/movements/${replacedData.movement.publicId}/revert`).set(headers),
      'revert-movement',
    ).expect(201);
    const revertedData = reverted.body.data as {
      original: {isReversed: boolean};
      reversal: {isReversal: boolean; reversalOfPublicId: string};
      balances: readonly {currentBalance: number}[];
    };
    expect(revertedData.original.isReversed).toBe(true);
    expect(revertedData.reversal.isReversal).toBe(true);
    expect(revertedData.reversal.reversalOfPublicId).toBe(replacedData.movement.publicId);
    expect(revertedData.balances).toEqual([
      expect.objectContaining({currentBalance: 8_000}),
    ]);

    const deleted = await e2e.http
      .delete(`/api/movements/${transfer.movement.publicId}`)
      .set(headers)
      .expect(200);
    expect((deleted.body.data as MutationResult).balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({accountPublicId: source.publicId, currentBalance: 10_000}),
        expect.objectContaining({accountPublicId: target.publicId, currentBalance: 0}),
      ]),
    );

    expect(await balanceOf(source.publicId)).toBe(10_000);
    expect(await balanceOf(target.publicId)).toBe(0);

    const audit = await database.dataSource.getRepository(AuditLogEntity).find({
      where: {userId: await userId(session.userPublicId)},
    });
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining([
        AuditActionEnum.EDIT.toString(),
        AuditActionEnum.REPLACE.toString(),
        AuditActionEnum.REVERSAL.toString(),
        AuditActionEnum.DELETE.toString(),
      ]),
    );

    const movements = database.dataSource.getRepository(MovementEntity);
    const original = await movements.findOne({
      where: {publicId: expense.movement.publicId},
      withDeleted: true,
    });
    const replacement = await movements.findOne({
      where: {publicId: replacedData.movement.publicId},
    });
    expect(original?.deletedAt).toBeTruthy();
    expect(replacement?.replacesMovementId).toBe(original?.id);

    expect(income.movement.amount).toBe(10_000);
  });

  it('rejects every closed-period write with PERIOD_CLOSED', async () => {
    const session = await registerE2eUser(e2e.http, 'closed-period');
    const headers = authHeaders(session);
    const categoryIds = await categories(session.accessToken);
    const account = await createAccount(session.accessToken, 'Cuenta cerrada');
    const user = await database.dataSource
      .getRepository(UserEntity)
      .findOne({where: {publicId: session.userPublicId}});
    if (!user) {
      throw new Error('Missing registered user');
    }

    await createClosedPeriod(database.dataSource, user, '2026-03');

    const blockedCreate = await withIdempotency(
      e2e.http.post('/api/movements').set(headers).send({
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 1_000,
        date: '2026-03-10T12:00:00.000Z',
        accountPublicId: account.publicId,
        categoryPublicId: categoryIds['Servicios'],
      }),
      'closed-create',
    ).expect(409);
    expect(blockedCreate.body.error.code).toBe('PERIOD_CLOSED');

    const movement = await createMovement(session.accessToken, {
      type: MovementTypeEnum.INCOME.toString(),
      amount: 1_000,
      date: '2026-04-10T12:00:00.000Z',
      accountPublicId: account.publicId,
      categoryPublicId: categoryIds['Nómina'],
    });
    await createClosedPeriod(database.dataSource, user, '2026-04');

    const blockedEdit = await withIdempotency(
      e2e.http
        .patch(`/api/movements/${movement.movement.publicId}`)
        .set(headers)
        .send({amount: 2_000, version: movement.movement.version}),
      'closed-edit',
    ).expect(409);
    expect(blockedEdit.body.error.code).toBe('PERIOD_CLOSED');

    const blockedReplace = await withIdempotency(
      e2e.http
        .patch(`/api/movements/${movement.movement.publicId}`)
        .set(headers)
        .send({
          type: MovementTypeEnum.INCOME.toString(),
          categoryPublicId: categoryIds['Nómina'],
          version: movement.movement.version,
        }),
      'closed-replace',
    ).expect(409);
    expect(blockedReplace.body.error.code).toBe('PERIOD_CLOSED');

    const blockedRevert = await withIdempotency(
      e2e.http.post(`/api/movements/${movement.movement.publicId}/revert`).set(headers),
      'closed-revert',
    ).expect(409);
    expect(blockedRevert.body.error.code).toBe('PERIOD_CLOSED');

    const blockedDelete = await e2e.http
      .delete(`/api/movements/${movement.movement.publicId}`)
      .set(headers)
      .expect(409);
    expect(blockedDelete.body.error.code).toBe('PERIOD_CLOSED');
  });

  it('never lets non-credit balances go negative and isolates tenants', async () => {
    const session = await registerE2eUser(e2e.http, 'balance-owner');
    const headers = authHeaders(session);
    const categoryIds = await categories(session.accessToken);

    const rejectedAccount = await e2e.http
      .post('/api/accounts')
      .set(headers)
      .send({name: 'Cuenta negativa', type: AccountTypeEnum.CASH.toString(), initialBalance: -1})
      .expect(400);
    expect(rejectedAccount.body.error.code).toBe('NEGATIVE_BALANCE_NOT_ALLOWED');

    const credit = await createAccount(
      session.accessToken,
      'Tarjeta',
      AccountTypeEnum.CREDIT.toString(),
      -150_000,
    );
    expect(credit.currentBalance).toBe(-150_000);
    expect(await balanceOf(credit.publicId)).toBe(-150_000);

    const cash = await createAccount(session.accessToken, 'Efectivo observable');
    const rejectedMovement = await withIdempotency(
      e2e.http.post('/api/movements').set(headers).send({
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 200_000,
        date: '2026-04-10T12:00:00.000Z',
        accountPublicId: cash.publicId,
        categoryPublicId: categoryIds['Servicios'],
      }),
      'negative-movement',
    ).expect(409);
    expect(rejectedMovement.body.error.code).toBe('NEGATIVE_BALANCE_NOT_ALLOWED');
    expect(await balanceOf(cash.publicId)).toBe(0);

    const movement = await createMovement(session.accessToken, {
      type: MovementTypeEnum.INCOME.toString(),
      amount: 1_000,
      date: '2026-04-10T12:00:00.000Z',
      accountPublicId: cash.publicId,
      categoryPublicId: categoryIds['Nómina'],
    });

    const other = await registerE2eUser(e2e.http, 'balance-intruder');
    const otherHeaders = authHeaders(other);
    await e2e.http
      .get(`/api/movements/${movement.movement.publicId}`)
      .set(otherHeaders)
      .expect(404);
    const forbiddenEdit = await withIdempotency(
      e2e.http
        .patch(`/api/movements/${movement.movement.publicId}`)
        .set(otherHeaders)
        .send({amount: 5_000}),
      'cross-tenant-edit',
    ).expect(404);
    expect(forbiddenEdit.body.error.code).toBe('MOVEMENT_NOT_FOUND');
    await e2e.http.delete(`/api/movements/${movement.movement.publicId}`).set(otherHeaders).expect(404);
    expect(await balanceOf(cash.publicId)).toBe(1_000);
  });
});

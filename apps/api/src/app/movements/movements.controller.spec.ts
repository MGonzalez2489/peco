import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {versionConflictException} from '../accounts/utils/version-conflict.exception';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {configureHttp} from '../common/http/configure-http';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {MovementsController} from './movements.controller';
import {MovementsService} from './movements.service';
import {movementLockedException} from './utils/movement-locked.exception';
import {movementNotFoundException} from './utils/movement-not-found.exception';
import {reversalPeriodClosedException} from './utils/reversal-period-closed.exception';

const RESULT = {
  movement: {
    publicId: 'movement-public-id',
    type: 'EXPENSE',
    amount: 45000,
    date: '2026-11-12T15:04:05.123Z',
    note: 'Supermercado',
    account: {
      publicId: 'source-account',
      name: 'Efectivo',
      type: 'CASH',
      color: '#10B981',
      icon: 'banknote',
    },
    targetAccount: null,
    category: {
      publicId: 'category-public-id',
      name: 'comida',
      displayName: 'Comida',
      color: '#F97316',
      icon: 'utensils',
      applyType: 'EXPENSE',
    },
    isReversal: false,
    isReversed: false,
    reversalOfPublicId: null,
    replacesPublicId: null,
    isCanceled: false,
    scheduledTransactionPublicId: null,
    version: 0,
    createdAt: '2026-11-12T15:04:05.123Z',
    updatedAt: '2026-11-12T15:04:05.123Z',
  },
  balances: [{accountPublicId: 'source-account', currentBalance: 105000, version: 4}],
};

const DETAIL = {
  ...RESULT.movement,
  isReversal: true,
  isReversed: false,
  isCanceled: false,
  reversalOfPublicId: 'original-public-id',
  replacesPublicId: 'replaced-public-id',
  scheduledTransactionPublicId: 'schedule-public-id',
};

const REVERSAL_RESULT = {
  original: {...RESULT.movement, isReversed: true, version: 1},
  reversal: {
    ...RESULT.movement,
    publicId: 'reversal-public-id',
    type: 'INCOME',
    note: 'Reversión de egreso movement-public-id',
    isReversal: true,
    reversalOfPublicId: 'movement-public-id',
    createdAt: '2026-11-22T10:00:00.000Z',
    updatedAt: '2026-11-22T10:00:00.000Z',
  },
  balances: [{accountPublicId: 'source-account', currentBalance: 100000, version: 5}],
};

const TOTALS = {totalIncome: 300000, totalExpenses: 145000, netBalance: 155000, count: 18};

const LIST_RESULT = {
  items: [RESULT.movement],
  nextCursor: 'eyJkIjoiMjAyNi0xMS0xMiIsImkiOjEyfQ',
  totals: TOTALS,
};

const BODY = {
  type: 'EXPENSE',
  amount: 45000,
  date: '2026-11-12T15:04:05.123Z',
  note: 'Supermercado',
  accountPublicId: 'source-account',
  categoryPublicId: 'category-public-id',
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('MovementsController HTTP contract (US-501–507)', () => {
  let app: INestApplication;
  let create: jest.Mock;
  let list: jest.Mock;
  let findOne: jest.Mock;
  let update: jest.Mock;
  let remove: jest.Mock;
  let revert: jest.Mock;

  const authGuard: CanActivate = {
    canActivate: (context: ExecutionContext): boolean => {
      context.switchToHttp().getRequest<AuthenticatedRequest>().auth = {
        publicId: 'user-public-id',
      };
      return true;
    },
  };

  beforeEach(async () => {
    create = jest.fn().mockResolvedValue(RESULT);
    list = jest.fn().mockResolvedValue(LIST_RESULT);
    findOne = jest.fn().mockResolvedValue(DETAIL);
    update = jest.fn().mockResolvedValue(RESULT);
    remove = jest.fn().mockResolvedValue({
      deletedPublicId: 'movement-public-id',
      balances: [{accountPublicId: 'source-account', currentBalance: 97000, version: 1}],
    });
    revert = jest.fn().mockResolvedValue(REVERSAL_RESULT);

    const moduleRef = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [
        {provide: MovementsService, useValue: {create, list, findOne, update, remove, revert}},
        {provide: APP_GUARD, useValue: authGuard},
      ],
    })
      .overrideGuard(AuthRateLimitGuard)
      .useValue({canActivate: () => true})
      .compile();

    app = moduleRef.createNestApplication();
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a movement and returns 201 with the single-resource envelope', async () => {
    const response = await request(app.getHttpServer()).post('/movements').send(BODY).expect(201);

    expect(response.body).toEqual({data: RESULT, error: null});
    expect(create).toHaveBeenCalledWith('user-public-id', BODY);
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['fractional', 12.5],
  ])('rejects a %s amount with 400 VALIDATION_ERROR', async (_label, amount) => {
    const response = await request(app.getHttpServer())
      .post('/movements')
      .send({...BODY, amount})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an impossible UTC date with 400 VALIDATION_ERROR', async () => {
    await request(app.getHttpServer())
      .post('/movements')
      .send({...BODY, date: '2026-02-30T10:00:00.000Z'})
      .expect(400);

    expect(create).not.toHaveBeenCalled();
  });

  it('rejects server-owned fields through the global whitelist', async () => {
    await request(app.getHttpServer())
      .post('/movements')
      .send({...BODY, version: 9, userId: 42})
      .expect(400);

    expect(create).not.toHaveBeenCalled();
  });

  it('lists movements with the next cursor and whole-filter totals in meta', async () => {
    const response = await request(app.getHttpServer()).get('/movements').expect(200);

    expect(response.body).toEqual({
      data: [RESULT.movement],
      meta: {
        correlationId: expect.any(String),
        nextCursor: LIST_RESULT.nextCursor,
        totals: TOTALS,
      },
      error: null,
    });
    expect(list).toHaveBeenCalledWith('user-public-id', expect.objectContaining({limit: 20}));
  });

  it('passes decoded filters to the service', async () => {
    await request(app.getHttpServer())
      .get('/movements')
      .query({
        period: '2026-11',
        type: 'EXPENSE',
        accountPublicId: ' source-account ',
        note: '  Super  ',
        excludeReversals: 'true',
        includeCanceled: 'false',
        limit: '5',
      })
      .expect(200);

    expect(list).toHaveBeenCalledWith(
      'user-public-id',
      expect.objectContaining({
        period: '2026-11',
        type: 'EXPENSE',
        accountPublicId: 'source-account',
        note: 'Super',
        excludeReversals: true,
        includeCanceled: false,
        limit: 5,
      }),
    );
  });

  it.each([
    ['limit', {limit: '101'}, 'limit'],
    ['cursor', {cursor: 'not-a-cursor'}, 'cursor'],
    ['period with from', {period: '2026-11', from: '2026-01-01'}, 'period'],
    ['range over 24 months', {from: '2024-01-01', to: '2026-02-01'}, 'to'],
    ['boolean filter', {excludeReversals: 'yes'}, 'excludeReversals'],
    ['unknown filter', {invented: 'value'}, 'invented'],
  ])('rejects an invalid %s with 400 VALIDATION_ERROR', async (_label, query, field) => {
    const response = await request(app.getHttpServer()).get('/movements').query(query).expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: {[field]: expect.any(String)}},
    });
    expect(list).not.toHaveBeenCalled();
  });

  it('returns the movement detail with its state links in the single-resource envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/movements/movement-public-id')
      .expect(200);

    expect(response.body).toEqual({data: DETAIL, error: null});
    expect(findOne).toHaveBeenCalledWith('user-public-id', 'movement-public-id');
  });

  it('maps a missing movement to 404 MOVEMENT_NOT_FOUND', async () => {
    findOne.mockRejectedValueOnce(movementNotFoundException());

    const response = await request(app.getHttpServer()).get('/movements/missing').expect(404);

    expect(response.body).toEqual({
      data: null,
      error: {
        statusCode: 404,
        code: 'MOVEMENT_NOT_FOUND',
        message: API_ERROR_MESSAGES.MOVEMENT_NOT_FOUND,
        correlationId: expect.any(String),
      },
    });
  });

  it('edits a movement and returns 200 with the single-resource envelope', async () => {
    const response = await request(app.getHttpServer())
      .patch('/movements/movement-public-id')
      .send({amount: 50000, note: '  Supermercado  ', version: 0})
      .expect(200);

    expect(response.body).toEqual({data: RESULT, error: null});
    expect(update).toHaveBeenCalledWith(
      'user-public-id',
      'movement-public-id',
      expect.objectContaining({amount: 50000, note: 'Supermercado', version: 0}),
    );
  });

  it('rejects an immutable date with 400 VALIDATION_ERROR on details.fields.date', async () => {
    const response = await request(app.getHttpServer())
      .patch('/movements/movement-public-id')
      .send({amount: 50000, date: '2026-11-16T10:00:00.000Z'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: {date: expect.any(String)}},
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('maps a stale version to 409 VERSION_CONFLICT', async () => {
    update.mockRejectedValueOnce(versionConflictException(0, 2));

    const response = await request(app.getHttpServer())
      .patch('/movements/movement-public-id')
      .send({amount: 50000, version: 0})
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'VERSION_CONFLICT',
      message: API_ERROR_MESSAGES.VERSION_CONFLICT,
      details: {expectedVersion: 0, currentVersion: 2},
    });
  });

  it('maps a locked movement to 409 MOVEMENT_LOCKED', async () => {
    update.mockRejectedValueOnce(movementLockedException());

    const response = await request(app.getHttpServer())
      .patch('/movements/movement-public-id')
      .send({amount: 50000})
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'MOVEMENT_LOCKED',
      message: API_ERROR_MESSAGES.MOVEMENT_LOCKED,
    });
  });

  it('returns the retired public id when a type change replaces the movement', async () => {
    update.mockResolvedValueOnce({
      ...RESULT,
      replacedPublicId: 'old-movement-public-id',
    });

    const response = await request(app.getHttpServer())
      .patch('/movements/movement-public-id')
      .send({type: 'INCOME', amount: 50000, version: 0})
      .expect(200);

    expect(response.body.data.replacedPublicId).toBe('old-movement-public-id');
    expect(update).toHaveBeenCalledWith(
      'user-public-id',
      'movement-public-id',
      expect.objectContaining({type: 'INCOME', amount: 50000, version: 0}),
    );
  });

  it('deletes a movement and returns 200 with the single-resource envelope', async () => {
    const response = await request(app.getHttpServer())
      .delete('/movements/movement-public-id')
      .expect(200);

    expect(response.body).toEqual({
      data: {
        deletedPublicId: 'movement-public-id',
        balances: [{accountPublicId: 'source-account', currentBalance: 97000, version: 1}],
      },
      error: null,
    });
    expect(remove).toHaveBeenCalledWith('user-public-id', 'movement-public-id');
  });

  it('maps a second delete to 404 MOVEMENT_NOT_FOUND', async () => {
    remove.mockRejectedValueOnce(movementNotFoundException());

    const response = await request(app.getHttpServer())
      .delete('/movements/movement-public-id')
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'MOVEMENT_NOT_FOUND',
      message: API_ERROR_MESSAGES.MOVEMENT_NOT_FOUND,
    });
  });

  it('maps a locked movement on delete to 409 MOVEMENT_LOCKED', async () => {
    remove.mockRejectedValueOnce(movementLockedException());

    const response = await request(app.getHttpServer())
      .delete('/movements/movement-public-id')
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'MOVEMENT_LOCKED',
      message: API_ERROR_MESSAGES.MOVEMENT_LOCKED,
    });
  });

  it('reverts a movement and returns 201 with both rows and the balances', async () => {
    const response = await request(app.getHttpServer())
      .post('/movements/movement-public-id/revert')
      .expect(201);

    expect(response.body).toEqual({data: REVERSAL_RESULT, error: null});
    expect(revert).toHaveBeenCalledWith('user-public-id', 'movement-public-id');
  });

  it('maps a second revert to 409 MOVEMENT_LOCKED', async () => {
    revert.mockRejectedValueOnce(movementLockedException());

    const response = await request(app.getHttpServer())
      .post('/movements/movement-public-id/revert')
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'MOVEMENT_LOCKED',
      message: API_ERROR_MESSAGES.MOVEMENT_LOCKED,
    });
  });

  it('maps an unknown movement on revert to 404 MOVEMENT_NOT_FOUND', async () => {
    revert.mockRejectedValueOnce(movementNotFoundException());

    const response = await request(app.getHttpServer())
      .post('/movements/movement-public-id/revert')
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'MOVEMENT_NOT_FOUND',
      message: API_ERROR_MESSAGES.MOVEMENT_NOT_FOUND,
    });
  });

  it('guides the user to a compensating movement when reverting a closed period', async () => {
    revert.mockRejectedValueOnce(reversalPeriodClosedException());

    const response = await request(app.getHttpServer())
      .post('/movements/movement-public-id/revert')
      .expect(409);

    expect(response.body.error).toMatchObject({
      code: 'PERIOD_CLOSED',
      message: expect.stringContaining('movimiento compensatorio'),
    });
  });
});

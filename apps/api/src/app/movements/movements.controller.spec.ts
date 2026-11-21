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
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {configureHttp} from '../common/http/configure-http';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {MovementsController} from './movements.controller';
import {MovementsService} from './movements.service';

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

describe('MovementsController HTTP contract (US-501)', () => {
  let app: INestApplication;
  let create: jest.Mock;

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

    const moduleRef = await Test.createTestingModule({
      controllers: [MovementsController],
      providers: [
        {provide: MovementsService, useValue: {create}},
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
});

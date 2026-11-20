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
import {VALIDATION_FIELD_MESSAGES} from '../common/validation/validation-field-messages.constant';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {AccountsController} from './accounts.controller';
import {AccountsService} from './accounts.service';
import {negativeBalanceNotAllowedException} from './utils/negative-balance-not-allowed.exception';

const ACCOUNT = {
  publicId: 'account-public-id',
  name: 'Efectivo',
  type: 'CASH',
  currentBalance: 150000,
  includeInTotal: true,
  targetGoal: null,
  creditLimit: null,
  color: '#10B981',
  icon: 'banknote',
  pinToHome: true,
  isRoot: true,
  note: null,
  version: 0,
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
};

const SUMMARY = {
  totalBalance: 150000,
  availableBalance: 150000,
  liabilitiesBalance: 0,
  typeSummaries: [
    {type: 'CASH', count: 1, total: 150000},
    {type: 'DEBIT', count: 0, total: 0},
    {type: 'CREDIT', count: 0, total: 0},
    {type: 'SAVINGS', count: 0, total: 0},
  ],
};

const CREATE_BODY = {
  name: '  Ahorros  ',
  type: 'SAVINGS',
  initialBalance: 500000,
  includeInTotal: true,
  targetGoal: 1000000,
  creditLimit: null,
  color: '#F59E0B',
  icon: 'piggy-bank',
  pinToHome: false,
  note: 'Cuenta de prueba',
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('AccountsController HTTP contract (US-301/US-302)', () => {
  let app: INestApplication;
  let list: jest.Mock;
  let create: jest.Mock;
  let authenticated = true;

  const authGuard: CanActivate = {
    canActivate: (context: ExecutionContext): boolean => {
      if (authenticated) {
        const http = context.switchToHttp();
        http.getRequest<AuthenticatedRequest>().auth = {publicId: 'user-public-id'};
      }
      return true;
    },
  };

  beforeEach(async () => {
    authenticated = true;
    list = jest.fn().mockResolvedValue({items: [ACCOUNT], summary: SUMMARY});
    create = jest.fn().mockResolvedValue(ACCOUNT);

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {provide: AccountsService, useValue: {list, create}},
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

  it('returns accounts in `data` and computed figures in `meta.summary`', async () => {
    const response = await request(app.getHttpServer()).get('/accounts').expect(200);

    expect(response.body).toEqual({
      data: [ACCOUNT],
      meta: {correlationId: expect.any(String), summary: SUMMARY},
    });
    expect(list).toHaveBeenCalledWith('user-public-id');
  });

  it('returns 404 NOT_FOUND when the authenticated user has been deleted', async () => {
    list.mockRejectedValueOnce(userNotFoundException());

    const response = await request(app.getHttpServer()).get('/accounts').expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('returns 401 UNAUTHORIZED when the guard did not attach a principal', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer()).get('/accounts').expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: API_ERROR_MESSAGES.UNAUTHORIZED,
    });
    expect(list).not.toHaveBeenCalled();
  });

  it('creates a non-root account and returns its public shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send(CREATE_BODY)
      .expect(201);

    expect(response.body).toEqual({
      data: ACCOUNT,
      meta: {correlationId: expect.any(String)},
    });
    expect(create).toHaveBeenCalledWith(
      'user-public-id',
      expect.objectContaining({name: 'Ahorros', type: 'SAVINGS', initialBalance: 500000}),
    );
  });

  it('accepts a negative initial balance for CREDIT accounts', async () => {
    const body = {...CREATE_BODY, type: 'CREDIT', initialBalance: -120000, creditLimit: 500000};

    await request(app.getHttpServer()).post('/accounts').send(body).expect(201);

    expect(create).toHaveBeenCalledWith(
      'user-public-id',
      expect.objectContaining({type: 'CREDIT', initialBalance: -120000, creditLimit: 500000}),
    );
  });

  it('rejects client-supplied isRoot and currentBalance as unknown fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({...CREATE_BODY, isRoot: true, currentBalance: 0})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {
        fields: {
          isRoot: VALIDATION_FIELD_MESSAGES.whitelistValidation,
          currentBalance: VALIDATION_FIELD_MESSAGES.whitelistValidation,
        },
      },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a missing or non-integer initial balance', async () => {
    const missing: Record<string, unknown> = {...CREATE_BODY};
    delete missing.initialBalance;

    const missingResponse = await request(app.getHttpServer())
      .post('/accounts')
      .send(missing)
      .expect(400);
    const decimalResponse = await request(app.getHttpServer())
      .post('/accounts')
      .send({...CREATE_BODY, initialBalance: 12.5})
      .expect(400);

    expect(missingResponse.body.error.details.fields).toHaveProperty('initialBalance');
    expect(decimalResponse.body.error.details.fields.initialBalance).toBe(
      VALIDATION_FIELD_MESSAGES.isInt,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an unsupported account type and a null boolean flag', async () => {
    const typeResponse = await request(app.getHttpServer())
      .post('/accounts')
      .send({...CREATE_BODY, type: 'INVALID'})
      .expect(400);
    const booleanResponse = await request(app.getHttpServer())
      .post('/accounts')
      .send({...CREATE_BODY, includeInTotal: null})
      .expect(400);

    expect(typeResponse.body.error.details.fields.type).toBe(VALIDATION_FIELD_MESSAGES.isIn);
    expect(booleanResponse.body.error.details.fields.includeInTotal).toBe(
      VALIDATION_FIELD_MESSAGES.isBoolean,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a credit limit on a non-credit account', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({...CREATE_BODY, creditLimit: 100000})
      .expect(400);

    expect(response.body.error.details.fields.creditLimit).toBe(
      VALIDATION_FIELD_MESSAGES.creditLimitOnlyForCredit,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('maps a negative non-credit balance to NEGATIVE_BALANCE_NOT_ALLOWED', async () => {
    create.mockRejectedValueOnce(negativeBalanceNotAllowedException());

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send({...CREATE_BODY, initialBalance: -1})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
      message: API_ERROR_MESSAGES.NEGATIVE_BALANCE_NOT_ALLOWED,
    });
  });

  it('returns 401 UNAUTHORIZED for account creation without a principal', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send(CREATE_BODY)
      .expect(401);

    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(create).not.toHaveBeenCalled();
  });
});

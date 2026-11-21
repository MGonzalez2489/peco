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
import {accountNotFoundException} from './utils/account-not-found.exception';
import {negativeBalanceConflictException} from './utils/negative-balance-conflict.exception';
import {negativeBalanceNotAllowedException} from './utils/negative-balance-not-allowed.exception';
import {periodClosedException} from './utils/period-closed.exception';
import {rootAccountProtectedException} from './utils/root-account-protected.exception';
import {selfTransferException} from './utils/self-transfer.exception';
import {transferRequiredException} from './utils/transfer-required.exception';
import {versionConflictException} from './utils/version-conflict.exception';

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

const UPDATE_BODY = {
  name: '  Ahorros actualizados  ',
  type: 'CREDIT',
  creditLimit: 500000,
  pinToHome: true,
  version: 0,
};

const DELETE_RESULT = {
  deletedAccountPublicId: 'account-public-id',
  transferMovement: null,
  balances: [{accountPublicId: 'account-public-id', currentBalance: 0, version: 1}],
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('AccountsController HTTP contract (US-301/US-302/US-303/US-305)', () => {
  let app: INestApplication;
  let list: jest.Mock;
  let create: jest.Mock;
  let findOne: jest.Mock;
  let update: jest.Mock;
  let setPin: jest.Mock;
  let remove: jest.Mock;
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
    findOne = jest.fn().mockResolvedValue(ACCOUNT);
    update = jest.fn().mockResolvedValue(ACCOUNT);
    setPin = jest.fn().mockResolvedValue(ACCOUNT);
    remove = jest.fn().mockResolvedValue(DELETE_RESULT);

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [
        {provide: AccountsService, useValue: {list, create, findOne, update, setPin, remove}},
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
      error: null,
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

  it('returns a single account in the standard envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/accounts/account-public-id')
      .expect(200);

    expect(response.body).toEqual({data: ACCOUNT, error: null});
    expect(findOne).toHaveBeenCalledWith('user-public-id', 'account-public-id');
  });

  it('maps a foreign or missing account detail to 404 NOT_FOUND', async () => {
    findOne.mockRejectedValueOnce(accountNotFoundException());

    const response = await request(app.getHttpServer())
      .get('/accounts/foreign-account-id')
      .expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('updates mutable metadata and returns the public account shape', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send(UPDATE_BODY)
      .expect(200);

    expect(response.body).toEqual({data: ACCOUNT, error: null});
    expect(update).toHaveBeenCalledWith(
      'user-public-id',
      'account-public-id',
      expect.objectContaining({
        name: 'Ahorros actualizados',
        type: 'CREDIT',
        creditLimit: 500000,
        pinToHome: true,
        version: 0,
      }),
    );
  });

  it('rejects server-owned fields and a null version in a patch', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send({...UPDATE_BODY, initialBalance: 1, currentBalance: 2, isRoot: true, version: null})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {
        fields: {
          initialBalance: VALIDATION_FIELD_MESSAGES.whitelistValidation,
          currentBalance: VALIDATION_FIELD_MESSAGES.whitelistValidation,
          isRoot: VALIDATION_FIELD_MESSAGES.whitelistValidation,
          version: VALIDATION_FIELD_MESSAGES.isInt,
        },
      },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an unsupported account type in a patch', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send({...UPDATE_BODY, type: 'INVALID'})
      .expect(400);

    expect(response.body.error.details.fields.type).toBe(VALIDATION_FIELD_MESSAGES.isIn);
    expect(update).not.toHaveBeenCalled();
  });

  it('maps a stale version to 409 VERSION_CONFLICT with details', async () => {
    update.mockRejectedValueOnce(versionConflictException(0, 1));

    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send(UPDATE_BODY)
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'VERSION_CONFLICT',
      message: API_ERROR_MESSAGES.VERSION_CONFLICT,
      details: {expectedVersion: 0, currentVersion: 1},
    });
  });

  it('maps a negative-balance type change to 409 NEGATIVE_BALANCE_NOT_ALLOWED', async () => {
    update.mockRejectedValueOnce(negativeBalanceConflictException());

    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send(UPDATE_BODY)
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'NEGATIVE_BALANCE_NOT_ALLOWED',
      message: API_ERROR_MESSAGES.NEGATIVE_BALANCE_NOT_ALLOWED,
    });
  });

  it('sets pinToHome explicitly and returns the public account shape', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: true, version: 0})
      .expect(200);

    expect(response.body).toEqual({data: ACCOUNT, error: null});
    expect(setPin).toHaveBeenCalledWith('user-public-id', 'account-public-id', {
      pinToHome: true,
      version: 0,
    });
  });

  it('unpins an account with an explicit false value', async () => {
    await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: false})
      .expect(200);

    expect(setPin).toHaveBeenCalledWith('user-public-id', 'account-public-id', {
      pinToHome: false,
    });
  });

  it('rejects a missing, null or non-boolean pinToHome and unknown fields', async () => {
    const missing = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({version: 0})
      .expect(400);
    const invalid = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: 'true', isRoot: true})
      .expect(400);
    const nullValue = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: null})
      .expect(400);

    expect(missing.body.error.details.fields.pinToHome).toBe(VALIDATION_FIELD_MESSAGES.isBoolean);
    expect(invalid.body.error.details.fields).toMatchObject({
      pinToHome: VALIDATION_FIELD_MESSAGES.isBoolean,
      isRoot: VALIDATION_FIELD_MESSAGES.whitelistValidation,
    });
    expect(nullValue.body.error.details.fields.pinToHome).toBe(VALIDATION_FIELD_MESSAGES.isBoolean);
    expect(setPin).not.toHaveBeenCalled();
  });

  it('rejects a non-integer version on pinning', async () => {
    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: true, version: 1.5})
      .expect(400);

    expect(response.body.error.details.fields.version).toBe(VALIDATION_FIELD_MESSAGES.isInt);
    expect(setPin).not.toHaveBeenCalled();
  });

  it('maps a foreign or missing pin target to 404 NOT_FOUND', async () => {
    setPin.mockRejectedValueOnce(accountNotFoundException());

    const response = await request(app.getHttpServer())
      .patch('/accounts/foreign-account-id/pin')
      .send({pinToHome: true})
      .expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('maps a stale version on pinning to 409 VERSION_CONFLICT with details', async () => {
    setPin.mockRejectedValueOnce(versionConflictException(0, 2));

    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: true, version: 0})
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'VERSION_CONFLICT',
      message: API_ERROR_MESSAGES.VERSION_CONFLICT,
      details: {expectedVersion: 0, currentVersion: 2},
    });
  });

  it('creates a non-root account and returns its public shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send(CREATE_BODY)
      .expect(201);

    expect(response.body).toEqual({
      data: ACCOUNT,
      error: null,
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

  it('returns 401 UNAUTHORIZED for detail, update, pinning and deletion without a principal', async () => {
    authenticated = false;

    const detail = await request(app.getHttpServer())
      .get('/accounts/account-public-id')
      .expect(401);
    const patch = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send(UPDATE_BODY)
      .expect(401);
    const pin = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send({pinToHome: true})
      .expect(401);
    const deletion = await request(app.getHttpServer())
      .delete('/accounts/account-public-id')
      .expect(401);

    expect(detail.body.error.code).toBe('UNAUTHORIZED');
    expect(patch.body.error.code).toBe('UNAUTHORIZED');
    expect(pin.body.error.code).toBe('UNAUTHORIZED');
    expect(deletion.body.error.code).toBe('UNAUTHORIZED');
    expect(findOne).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(setPin).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('deletes an account and returns the standard envelope with balances', async () => {
    const response = await request(app.getHttpServer())
      .delete('/accounts/account-public-id')
      .expect(200);

    expect(response.body).toEqual({data: DELETE_RESULT, error: null});
    expect(remove).toHaveBeenCalledWith('user-public-id', 'account-public-id', undefined);
  });

  it('forwards an optional transfer destination as a query parameter', async () => {
    await request(app.getHttpServer())
      .delete('/accounts/account-public-id?transferToPublicId=destination-id')
      .expect(200);

    expect(remove).toHaveBeenCalledWith('user-public-id', 'account-public-id', 'destination-id');
  });

  it.each([
    [accountNotFoundException, 404, 'NOT_FOUND'],
    [rootAccountProtectedException, 409, 'ROOT_ACCOUNT_PROTECTED'],
    [transferRequiredException, 409, 'TRANSFER_REQUIRED'],
    [negativeBalanceConflictException, 409, 'NEGATIVE_BALANCE_NOT_ALLOWED'],
    [periodClosedException, 409, 'PERIOD_CLOSED'],
    [selfTransferException, 422, 'UNPROCESSABLE_ENTITY'],
  ])('maps the deletion factory to %s', async (factory, status, code) => {
    remove.mockRejectedValueOnce(factory());

    const response = await request(app.getHttpServer())
      .delete('/accounts/account-public-id')
      .expect(status);

    expect(response.body.error).toMatchObject({
      statusCode: status,
      code,
      message: expect.any(String),
    });
  });
});

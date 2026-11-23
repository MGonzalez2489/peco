import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {negativeBalanceConflictException} from '../accounts/utils/negative-balance-conflict.exception';
import {periodClosedException} from '../accounts/utils/period-closed.exception';
import {selfTransferException} from '../accounts/utils/self-transfer.exception';
import {transferRequiredException} from '../accounts/utils/transfer-required.exception';
import {versionConflictException} from '../accounts/utils/version-conflict.exception';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {configureHttp} from '../common/http/configure-http';
import {createOpenApiDocument} from '../common/openapi/create-open-api-document';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {VALIDATION_FIELD_MESSAGES} from '../common/validation/validation-field-messages.constant';
import {categoryNotCompatibleException} from '../movements/utils/category-not-compatible.exception';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {ScheduledTransactionsController} from './scheduled-transactions.controller';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {occurrenceAlreadyProcessedException} from './utils/occurrence-already-processed.exception';
import {scheduleInactiveException} from './utils/schedule-inactive.exception';
import {scheduledTransactionResourceNotFoundException} from './utils/scheduled-transaction-resource-not-found.exception';

const SCHEDULE = {
  publicId: 'schedule-public-id',
  name: 'Renta',
  estimatedAmount: 800000,
  type: 'EXPENSE',
  category: {
    publicId: 'category-public-id',
    displayName: 'Servicios',
    color: '#F59E0B',
    icon: 'zap',
  },
  sourceAccount: {
    publicId: 'source-account-public-id',
    name: 'Débito',
    type: 'DEBIT',
    color: '#0EA5E9',
    icon: 'credit-card',
  },
  destinationAccount: null,
  frequency: 'MONTHLY',
  interval: 1,
  anchorDate: '2026-12-31',
  nextContemplatedDate: '2026-12-31',
  nextExecutionDate: '2026-12-30',
  autoApply: true,
  active: true,
  totalOccurrences: null,
  completedOccurrences: 0,
  endDate: null,
  version: 0,
  createdAt: '2026-11-23T10:00:00.000Z',
  updatedAt: '2026-11-23T10:00:00.000Z',
};

const BODY = {
  name: '  Renta  ',
  estimatedAmount: 800000,
  type: 'EXPENSE',
  categoryPublicId: 'category-public-id',
  sourceAccountPublicId: 'source-account-public-id',
  frequency: 'MONTHLY',
  anchorDate: '2026-12-31',
  autoApply: true,
  totalOccurrences: null,
  endDate: null,
};

const EXECUTE_RESPONSE = {
  occurrence: {
    contemplatedDate: '2026-12-31',
    occurrenceDate: '2026-12-30',
    status: 'APPLIED',
    reason: null,
  },
  movement: {
    publicId: 'movement-public-id',
    amount: 800000,
    date: '2026-12-30T00:00:00.000Z',
  },
  schedule: SCHEDULE,
  balances: [{accountPublicId: 'source-account-public-id', currentBalance: 0, version: 5}],
};

const CANCEL_RESPONSE = {
  occurrence: {
    contemplatedDate: '2026-12-31',
    occurrenceDate: '2026-12-30',
    status: 'SKIPPED',
    reason: 'USER_CANCELLED',
  },
  movement: {
    publicId: 'canceled-movement-public-id',
    amount: 800000,
    date: '2026-12-30T00:00:00.000Z',
    isCanceled: true,
  },
  schedule: {...SCHEDULE, version: 1},
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('ScheduledTransactionsController HTTP contract (US-601–US-605)', () => {
  let app: INestApplication;
  let create: jest.Mock;
  let list: jest.Mock;
  let findOne: jest.Mock;
  let update: jest.Mock;
  let toggle: jest.Mock;
  let execute: jest.Mock;
  let cancel: jest.Mock;

  const authGuard: CanActivate = {
    canActivate: (context: ExecutionContext): boolean => {
      context.switchToHttp().getRequest<AuthenticatedRequest>().auth = {
        publicId: 'user-public-id',
      };
      return true;
    },
  };

  beforeEach(async () => {
    create = jest.fn().mockResolvedValue(SCHEDULE);
    list = jest.fn().mockResolvedValue({items: [SCHEDULE], nextCursor: 'next-cursor'});
    findOne = jest.fn().mockResolvedValue(SCHEDULE);
    update = jest.fn().mockResolvedValue(SCHEDULE);
    toggle = jest.fn().mockResolvedValue({...SCHEDULE, active: false});
    execute = jest.fn().mockResolvedValue(EXECUTE_RESPONSE);
    cancel = jest.fn().mockResolvedValue(CANCEL_RESPONSE);
    const moduleRef = await Test.createTestingModule({
      controllers: [ScheduledTransactionsController],
      providers: [
        {
          provide: ScheduledTransactionsService,
          useValue: {create, list, findOne, update, toggle, execute, cancel},
        },
      ],
    })
      .overrideGuard(AuthRateLimitGuard)
      .useValue({canActivate: () => true})
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(authGuard);
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a schedule without requiring an idempotency key', async () => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions')
      .send(BODY)
      .expect(201);

    expect(response.body).toEqual({data: SCHEDULE, error: null});
    expect(create).toHaveBeenCalledWith('user-public-id', {
      name: 'Renta',
      estimatedAmount: 800000,
      type: 'EXPENSE',
      categoryPublicId: 'category-public-id',
      sourceAccountPublicId: 'source-account-public-id',
      frequency: 'MONTHLY',
      anchorDate: '2026-12-31',
      autoApply: true,
      totalOccurrences: null,
      endDate: null,
    });
  });

  it.each([
    ['zero amount', {estimatedAmount: 0}, 'estimatedAmount'],
    ['fractional amount', {estimatedAmount: 80000.5}, 'estimatedAmount'],
    ['zero interval', {interval: 0}, 'interval'],
    ['interval above a year', {interval: 366}, 'interval'],
    ['unknown frequency', {frequency: 'HOURLY'}, 'frequency'],
    ['impossible anchor', {anchorDate: '2026-02-30'}, 'anchorDate'],
  ])('rejects a %s with 400 VALIDATION_ERROR', async (_label, changes, field) => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions')
      .send({...BODY, ...changes})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
    });
    expect(response.body.error.details.fields).toHaveProperty(field);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an end date before the anchor', async () => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions')
      .send({...BODY, endDate: '2026-12-30'})
      .expect(400);

    expect(response.body.error.details.fields.endDate).toBe(
      VALIDATION_FIELD_MESSAGES.endDateNotBeforeAnchor,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects server-owned fields through the global whitelist', async () => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions')
      .send({...BODY, nextExecutionDate: '2026-01-01'})
      .expect(400);

    expect(response.body.error.details.fields).toHaveProperty('nextExecutionDate');
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    ['missing destination', transferRequiredException(), 409, 'TRANSFER_REQUIRED'],
    ['self transfer', selfTransferException(), 422, 'UNPROCESSABLE_ENTITY'],
    [
      'incompatible category',
      categoryNotCompatibleException(),
      422,
      'CATEGORY_NOT_COMPATIBLE',
    ],
    ['foreign resource', scheduledTransactionResourceNotFoundException(), 404, 'NOT_FOUND'],
    ['unknown user', userNotFoundException(), 404, 'NOT_FOUND'],
  ])('maps %s to its stable error code', async (_label, error, status, code) => {
    create.mockRejectedValueOnce(error);

    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions')
      .send(BODY)
      .expect(status);

    expect(response.body.error.code).toBe(code);
  });

  it('lists schedules with a next cursor in meta', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduled-transactions')
      .query({period: '2026-11', active: 'true', limit: 5})
      .expect(200);

    expect(response.body).toMatchObject({
      data: [SCHEDULE],
      meta: {nextCursor: 'next-cursor'},
      error: null,
    });
    expect(response.body.meta.correlationId).toEqual(expect.any(String));
    expect(list).toHaveBeenCalledWith('user-public-id', {
      period: '2026-11',
      active: true,
      limit: 5,
    });
  });

  it.each([
    ['period', {period: '2026-13'}],
    ['cursor', {cursor: 'not-a-cursor'}],
    ['boolean filter', {active: 'yes'}],
  ])('rejects an invalid %s with 400 VALIDATION_ERROR', async (_label, query) => {
    const response = await request(app.getHttpServer())
      .get('/scheduled-transactions')
      .query(query)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(list).not.toHaveBeenCalled();
  });

  it('returns an owner-scoped schedule detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/scheduled-transactions/schedule-public-id')
      .expect(200);

    expect(response.body).toEqual({data: SCHEDULE, error: null});
    expect(findOne).toHaveBeenCalledWith('user-public-id', 'schedule-public-id');
  });

  it('updates a schedule with a version and an idempotency key', async () => {
    const response = await request(app.getHttpServer())
      .patch('/scheduled-transactions/schedule-public-id')
      .set('Idempotency-Key', 'schedules-update-1')
      .send({name: '  Renta actualizada  ', estimatedAmount: 900000, version: 0})
      .expect(200);

    expect(response.body).toEqual({data: SCHEDULE, error: null});
    expect(update).toHaveBeenCalledWith('user-public-id', 'schedule-public-id', {
      name: 'Renta actualizada',
      estimatedAmount: 900000,
      version: 0,
    });
  });

  it('maps version and occurrence conflicts to 409', async () => {
    update.mockRejectedValueOnce(versionConflictException(0, 1));
    const conflict = await request(app.getHttpServer())
      .patch('/scheduled-transactions/schedule-public-id')
      .set('Idempotency-Key', 'schedules-update-2')
      .send({version: 0})
      .expect(409);
    expect(conflict.body.error.code).toBe('VERSION_CONFLICT');

    update.mockRejectedValueOnce(occurrenceAlreadyProcessedException());
    const processed = await request(app.getHttpServer())
      .patch('/scheduled-transactions/schedule-public-id')
      .set('Idempotency-Key', 'schedules-update-3')
      .send({anchorDate: '2026-12-01'})
      .expect(409);
    expect(processed.body.error.code).toBe('OCCURRENCE_ALREADY_PROCESSED');
  });

  it('sets the active state explicitly without requiring an idempotency key', async () => {
    const response = await request(app.getHttpServer())
      .patch('/scheduled-transactions/schedule-public-id/toggle')
      .send({active: false, version: 0})
      .expect(200);

    expect(response.body).toEqual({data: {...SCHEDULE, active: false}, error: null});
    expect(toggle).toHaveBeenCalledWith('user-public-id', 'schedule-public-id', {
      active: false,
      version: 0,
    });
  });

  it.each([
    ['missing active', {}],
    ['non-boolean active', {active: 'yes'}],
    ['server-owned field', {active: false, nextExecutionDate: '2026-01-01'}],
  ])('rejects a %s with 400 VALIDATION_ERROR', async (_label, body) => {
    const response = await request(app.getHttpServer())
      .patch('/scheduled-transactions/schedule-public-id/toggle')
      .send(body)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(toggle).not.toHaveBeenCalled();
  });

  it('maps a stale toggle version to 409', async () => {
    toggle.mockRejectedValueOnce(versionConflictException(0, 1));

    const response = await request(app.getHttpServer())
      .patch('/scheduled-transactions/schedule-public-id/toggle')
      .send({active: true, version: 0})
      .expect(409);

    expect(response.body.error.code).toBe('VERSION_CONFLICT');
  });

  it('executes one occurrence with an idempotency key and an amount override', async () => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/execute')
      .set('Idempotency-Key', 'schedules-execute-1')
      .send({actualAmount: 75000})
      .expect(201);

    expect(response.body).toEqual({data: EXECUTE_RESPONSE, error: null});
    expect(execute).toHaveBeenCalledWith('user-public-id', 'schedule-public-id', {
      actualAmount: 75000,
    });
  });

  it.each([
    ['zero amount', {actualAmount: 0}],
    ['fractional amount', {actualAmount: 12.34}],
    ['server-owned field', {status: 'APPLIED'}],
  ])('rejects a %s with 400 VALIDATION_ERROR', async (_label, body) => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/execute')
      .set('Idempotency-Key', `schedules-execute-invalid-${_label.replace(/\s/g, '-')}`)
      .send(body)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(execute).not.toHaveBeenCalled();
  });

  it('maps inactive schedules and failed balance checks to 409', async () => {
    execute.mockRejectedValueOnce(scheduleInactiveException());
    const inactive = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/execute')
      .set('Idempotency-Key', 'schedules-execute-inactive')
      .send({})
      .expect(409);
    expect(inactive.body.error.code).toBe('SCHEDULE_INACTIVE');

    execute.mockRejectedValueOnce(negativeBalanceConflictException());
    const failed = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/execute')
      .set('Idempotency-Key', 'schedules-execute-failed')
      .send({})
      .expect(409);
    expect(failed.body.error.code).toBe('NEGATIVE_BALANCE_NOT_ALLOWED');
  });

  it('cancels one occurrence with an idempotency key and an optional note', async () => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/cancel-occurrence')
      .set('Idempotency-Key', 'schedules-cancel-1')
      .send({note: 'Cancelada por el usuario'})
      .expect(201);

    expect(response.body).toEqual({data: CANCEL_RESPONSE, error: null});
    expect(cancel).toHaveBeenCalledWith('user-public-id', 'schedule-public-id', {
      note: 'Cancelada por el usuario',
    });
  });

  it.each([
    ['long note', {note: 'x'.repeat(501)}],
    ['non-string note', {note: 7}],
    ['server-owned field', {status: 'SKIPPED'}],
  ])('rejects a %s with 400 VALIDATION_ERROR', async (_label, body) => {
    const response = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/cancel-occurrence')
      .set('Idempotency-Key', `schedules-cancel-invalid-${_label.replace(/\s/g, '-')}`)
      .send(body)
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(cancel).not.toHaveBeenCalled();
  });

  it('maps duplicate and closed-period cancellations to 409', async () => {
    cancel.mockRejectedValueOnce(occurrenceAlreadyProcessedException());
    const duplicate = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/cancel-occurrence')
      .set('Idempotency-Key', 'schedules-cancel-duplicate')
      .send({})
      .expect(409);
    expect(duplicate.body.error.code).toBe('OCCURRENCE_ALREADY_PROCESSED');

    cancel.mockRejectedValueOnce(periodClosedException());
    const closed = await request(app.getHttpServer())
      .post('/scheduled-transactions/schedule-public-id/cancel-occurrence')
      .set('Idempotency-Key', 'schedules-cancel-closed')
      .send({})
      .expect(409);
    expect(closed.body.error.code).toBe('PERIOD_CLOSED');
  });

  it('documents the list, detail, toggle, update, execute and cancel routes in OpenAPI', () => {
    const document = createOpenApiDocument(app);

    expect(document.paths['/scheduled-transactions']?.post).toBeDefined();
    expect(document.paths['/scheduled-transactions']?.get).toBeDefined();
    expect(document.paths['/scheduled-transactions/{publicId}']?.get).toBeDefined();
    expect(document.paths['/scheduled-transactions/{publicId}']?.patch).toBeDefined();
    expect(document.paths['/scheduled-transactions/{publicId}/toggle']?.patch).toBeDefined();
    expect(document.paths['/scheduled-transactions/{publicId}/execute']?.post).toBeDefined();
    expect(
      document.paths['/scheduled-transactions/{publicId}/cancel-occurrence']?.post,
    ).toBeDefined();
  });
});

import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {selfTransferException} from '../accounts/utils/self-transfer.exception';
import {transferRequiredException} from '../accounts/utils/transfer-required.exception';
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

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('ScheduledTransactionsController HTTP contract (US-601)', () => {
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
    create = jest.fn().mockResolvedValue(SCHEDULE);
    const moduleRef = await Test.createTestingModule({
      controllers: [ScheduledTransactionsController],
      providers: [{provide: ScheduledTransactionsService, useValue: {create}}],
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

  it('documents the create route in OpenAPI', () => {
    const document = createOpenApiDocument(app);

    expect(document.paths['/scheduled-transactions']?.post).toBeDefined();
  });
});

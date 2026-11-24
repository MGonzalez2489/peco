import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {configureHttp} from '../common/http/configure-http';
import {IdempotencyInterceptor} from '../common/idempotency/interceptors/idempotency.interceptor';
import type {IdempotencyService} from '../common/idempotency/services/idempotency.service';
import {createOpenApiDocument} from '../common/openapi/create-open-api-document';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {periodNotClosableException} from './utils/period-not-closable.exception';
import {PeriodsController} from './periods.controller';
import {PeriodClosingService} from './services/period-closing.service';

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

const SNAPSHOT = {
  period: '2026-10',
  startDate: '2026-10-01',
  endDate: '2026-10-31',
  globalInitialBalance: 100_000,
  globalFinalBalance: 120_000,
  totalInflows: 20_000,
  totalOutflows: 0,
  totalTransfers: 0,
  totalTransactionsCount: 1,
  closedAt: '2026-11-01T00:00:03.000Z',
  accountBalances: [
    {
      accountPublicId: 'account-public-id',
      accountName: 'Efectivo',
      accountType: 'CASH',
      color: '#10B981',
      icon: 'banknote',
      initialBalance: 100_000,
      finalBalance: 120_000,
      totalTransactions: 1,
      totalInflows: 20_000,
      totalOutflows: 0,
      totalTransfers: 0,
    },
  ],
};

describe('PeriodsController (US-701)', () => {
  let app: INestApplication;
  let close: jest.Mock;

  const authGuard: CanActivate = {
    canActivate: (context: ExecutionContext): boolean => {
      context.switchToHttp().getRequest<AuthenticatedRequest>().auth = {
        publicId: 'user-public-id',
        previousLastActiveAt: null,
      };
      return true;
    },
  };

  beforeEach(async () => {
    close = jest.fn().mockResolvedValue({snapshot: SNAPSHOT, created: true});
    const execute = jest.fn().mockImplementation(async (_input, run: () => Promise<unknown>) => {
      const handled = (await run()) as {statusCode: number; value: unknown};
      return {kind: 'success', value: handled.value};
    });
    const interceptor = new IdempotencyInterceptor(
      {execute} as unknown as IdempotencyService,
      new Reflector(),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [PeriodsController],
      providers: [{provide: PeriodClosingService, useValue: {close}}],
    })
      .overrideGuard(AuthRateLimitGuard)
      .useValue({canActivate: () => true})
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalGuards(authGuard);
    configureHttp(app, {logger: SILENT_LOGGER, idempotency: interceptor});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with the snapshot on the first close', async () => {
    const response = await request(app.getHttpServer())
      .post('/periods/2026-10/close')
      .set('Idempotency-Key', 'close-2026-10')
      .expect(201);

    expect(response.body).toEqual({data: SNAPSHOT, error: null});
    expect(close).toHaveBeenCalledWith('user-public-id', '2026-10');
  });

  it('returns 200 on a replay', async () => {
    close.mockResolvedValue({snapshot: SNAPSHOT, created: false});

    await request(app.getHttpServer())
      .post('/periods/2026-10/close')
      .set('Idempotency-Key', 'close-2026-10-replay')
      .expect(200);
  });

  it('requires an idempotency key', async () => {
    const response = await request(app.getHttpServer())
      .post('/periods/2026-10/close')
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: {idempotencyKey: expect.any(String)}},
    });
    expect(close).not.toHaveBeenCalled();
  });

  it.each(['2026-13', 'octubre', '2026-1'])('rejects the invalid period %s', async (period) => {
    const response = await request(app.getHttpServer())
      .post(`/periods/${period}/close`)
      .set('Idempotency-Key', 'close-invalid-period')
      .expect(400);

    expect(response.body.error.details.fields).toHaveProperty('period');
    expect(close).not.toHaveBeenCalled();
  });

  it('renders domain failures as the standard error envelope', async () => {
    close.mockRejectedValue(periodNotClosableException());

    const response = await request(app.getHttpServer())
      .post('/periods/2026-11/close')
      .set('Idempotency-Key', 'close-conflict')
      .expect(409);

    expect(response.body.error.code).toBe('PERIOD_NOT_CLOSABLE');
  });

  it('documents the close route in OpenAPI', async () => {
    const document = createOpenApiDocument(app);

    expect(Object.keys(document.paths ?? {}).some((path) => path.endsWith('/periods/{period}/close'))).toBe(
      true,
    );
  });
});

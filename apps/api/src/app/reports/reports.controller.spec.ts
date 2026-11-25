import {
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {configureHttp} from '../common/http/configure-http';
import {createOpenApiDocument} from '../common/openapi/create-open-api-document';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {accountNotFoundException} from '../accounts/utils/account-not-found.exception';
import {periodReadException} from '../periods/utils/period-read.exception';
import {PeriodReportService} from '../periods/services/period-report.service';
import {AccountProgressionService} from './services/account-progression.service';
import {ReportsController} from './reports.controller';

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

const REPORT = {
  period: '2026-11',
  status: 'CURRENT',
  totals: {totalIncome: 300_000, totalExpenses: 145_000, netBalance: 155_000, transactionCount: 18},
  balances: {totalBalance: 520_000, availableBalance: 400_000, liabilitiesBalance: 120_000},
  comparison: {period: '2026-10', totalIncome: 280_000, totalExpenses: 150_000, netBalance: 130_000},
};

const PROGRESSION = {
  period: '2026-11',
  account: {
    publicId: 'account-public-id',
    name: 'Efectivo',
    type: 'CASH',
    color: '#10B981',
    icon: 'banknote',
  },
  initialBalance: 100_000,
  finalBalance: 150_000,
  creditUsage: null,
  points: [
    {date: '2026-11-01', balance: 100_000},
    {date: '2026-11-12', balance: 150_000},
  ],
};

describe('ReportsController (US-801/US-802)', () => {
  let app: INestApplication;
  let find: jest.Mock;
  let findProgression: jest.Mock;

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
    find = jest.fn().mockResolvedValue(REPORT);
    findProgression = jest.fn().mockResolvedValue(PROGRESSION);

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {provide: PeriodReportService, useValue: {find}},
        {provide: AccountProgressionService, useValue: {find: findProgression}},
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

  it('returns the dashboard report in the standard envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/dashboard?period=2026-11')
      .expect(200);

    expect(response.body).toEqual({data: REPORT, error: null});
    expect(find).toHaveBeenCalledWith('user-public-id', '2026-11');
  });

  it.each(['2026-13', 'octubre', '2026-1'])(
    'rejects the invalid period %s with 400 VALIDATION_ERROR',
    async (period) => {
      const response = await request(app.getHttpServer())
        .get(`/reports/dashboard?period=${period}`)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: API_ERROR_MESSAGES.VALIDATION_ERROR,
        details: {fields: {period: expect.any(String)}},
      });
      expect(find).not.toHaveBeenCalled();
    },
  );

  it('requires the period query parameter', async () => {
    const response = await request(app.getHttpServer()).get('/reports/dashboard').expect(400);

    expect(response.body.error.details.fields).toHaveProperty('period');
    expect(find).not.toHaveBeenCalled();
  });

  it('renders a missing user as the standard error envelope', async () => {
    find.mockRejectedValue(periodReadException());

    const response = await request(app.getHttpServer())
      .get('/reports/dashboard?period=2026-11')
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('returns an account progression in the standard envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/accounts/account-public-id/progression?period=2026-11')
      .expect(200);

    expect(response.body).toEqual({data: PROGRESSION, error: null});
    expect(findProgression).toHaveBeenCalledWith(
      'user-public-id',
      'account-public-id',
      '2026-11',
    );
  });

  it.each(['2026-13', 'octubre', '2026-1'])(
    'rejects the progression period %s with 400 VALIDATION_ERROR',
    async (period) => {
      const response = await request(app.getHttpServer())
        .get(`/reports/accounts/account-public-id/progression?period=${period}`)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: API_ERROR_MESSAGES.VALIDATION_ERROR,
        details: {fields: {period: expect.any(String)}},
      });
      expect(findProgression).not.toHaveBeenCalled();
    },
  );

  it('renders a foreign or missing account as 404', async () => {
    findProgression.mockRejectedValue(accountNotFoundException());

    const response = await request(app.getHttpServer())
      .get('/reports/accounts/foreign-account/progression?period=2026-11')
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('documents both report routes and their schemas in OpenAPI', () => {
    const document = createOpenApiDocument(app);

    expect(Object.keys(document.paths ?? {})).toContain('/reports/dashboard');
    expect(Object.keys(document.paths ?? {})).toContain(
      '/reports/accounts/{publicId}/progression',
    );
    expect(document.components?.schemas?.DashboardReportResponseDto).toMatchObject({
      properties: {
        status: {enum: ['CLOSED', 'CURRENT', 'FUTURE']},
      },
    });
    expect(document.components?.schemas?.AccountProgressionResponseDto).toMatchObject({
      properties: {
        account: {$ref: '#/components/schemas/AccountProgressionAccountDto'},
        points: {
          items: {$ref: '#/components/schemas/AccountProgressionPointDto'},
          type: 'array',
        },
      },
    });
  });
});

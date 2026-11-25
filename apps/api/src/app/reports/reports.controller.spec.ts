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
import {CategoryDistributionService} from './services/category-distribution.service';
import {MovementProgressionService} from './services/movement-progression.service';
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

const MOVEMENT_PROGRESSION = {
  period: '2026-11',
  points: [
    {date: '2026-11-01', net: 0},
    {date: '2026-11-12', net: 155_000},
  ],
  totals: {totalIncome: 300_000, totalExpenses: 145_000, netBalance: 155_000},
};

const CATEGORY_DISTRIBUTION = {
  period: '2026-11',
  type: 'EXPENSE',
  total: 145_000,
  items: [
    {
      categoryPublicId: 'food-id',
      displayName: 'Comida',
      color: '#F97316',
      icon: 'utensils',
      amount: 90_000,
      percentage: 62,
    },
  ],
};

describe('ReportsController (US-801–US-804)', () => {
  let app: INestApplication;
  let find: jest.Mock;
  let findProgression: jest.Mock;
  let findMovementProgression: jest.Mock;
  let findCategoryDistribution: jest.Mock;

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
    findMovementProgression = jest.fn().mockResolvedValue(MOVEMENT_PROGRESSION);
    findCategoryDistribution = jest.fn().mockResolvedValue(CATEGORY_DISTRIBUTION);

    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {provide: PeriodReportService, useValue: {find}},
        {provide: AccountProgressionService, useValue: {find: findProgression}},
        {provide: MovementProgressionService, useValue: {find: findMovementProgression}},
        {provide: CategoryDistributionService, useValue: {find: findCategoryDistribution}},
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

  it('returns a movement progression in the §8.13 shape and standard envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/movements/progression?period=2026-11')
      .expect(200);

    expect(response.body).toEqual({data: MOVEMENT_PROGRESSION, error: null});
    expect(findMovementProgression).toHaveBeenCalledWith(
      'user-public-id',
      '2026-11',
      false,
    );
  });

  it('forwards the excludeReversals query parameter to the service', async () => {
    await request(app.getHttpServer())
      .get('/reports/movements/progression?period=2026-11&excludeReversals=true')
      .expect(200);

    expect(findMovementProgression).toHaveBeenCalledWith(
      'user-public-id',
      '2026-11',
      true,
    );
  });

  it.each([
    'period=2026-13',
    'period=2026-11&excludeReversals=maybe',
  ])('rejects the invalid movement query %s with 400 VALIDATION_ERROR', async (query) => {
    const response = await request(app.getHttpServer())
      .get(`/reports/movements/progression?${query}`)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: expect.any(Object)},
    });
    expect(findMovementProgression).not.toHaveBeenCalled();
  });

  it('renders a missing user for the movement progression as 404', async () => {
    findMovementProgression.mockRejectedValue(periodReadException());

    const response = await request(app.getHttpServer())
      .get('/reports/movements/progression?period=2026-11')
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('returns a category distribution in the §8.13 shape and standard envelope', async () => {
    const response = await request(app.getHttpServer())
      .get('/reports/categories/distribution?period=2026-11&type=EXPENSE')
      .expect(200);

    expect(response.body).toEqual({data: CATEGORY_DISTRIBUTION, error: null});
    expect(findCategoryDistribution).toHaveBeenCalledWith(
      'user-public-id',
      '2026-11',
      'EXPENSE',
    );
  });

  it.each([
    'period=2026-13&type=EXPENSE',
    'period=2026-11&type=TRANSFER',
    'period=2026-11',
    'type=INCOME',
  ])('rejects the invalid category query %s with 400 VALIDATION_ERROR', async (query) => {
    const response = await request(app.getHttpServer())
      .get(`/reports/categories/distribution?${query}`)
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: expect.any(Object)},
    });
    expect(findCategoryDistribution).not.toHaveBeenCalled();
  });

  it('renders a missing user for the category distribution as 404', async () => {
    findCategoryDistribution.mockRejectedValue(periodReadException());

    const response = await request(app.getHttpServer())
      .get('/reports/categories/distribution?period=2026-11&type=INCOME')
      .expect(404);

    expect(response.body.error).toMatchObject({
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('documents all report routes and their schemas in OpenAPI', () => {
    const document = createOpenApiDocument(app);

    expect(Object.keys(document.paths ?? {})).toContain('/reports/dashboard');
    expect(Object.keys(document.paths ?? {})).toContain(
      '/reports/accounts/{publicId}/progression',
    );
    expect(Object.keys(document.paths ?? {})).toContain('/reports/movements/progression');
    expect(Object.keys(document.paths ?? {})).toContain('/reports/categories/distribution');
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
    expect(document.components?.schemas?.MovementProgressionResponseDto).toMatchObject({
      properties: {
        points: {
          items: {$ref: '#/components/schemas/MovementProgressionPointDto'},
          type: 'array',
        },
        totals: {$ref: '#/components/schemas/MovementProgressionTotalsDto'},
      },
    });
    expect(document.paths?.['/reports/movements/progression']?.get?.parameters).toEqual(
      expect.arrayContaining([expect.objectContaining({name: 'excludeReversals', required: false})]),
    );
    expect(document.components?.schemas?.CategoryDistributionResponseDto).toMatchObject({
      properties: {
        type: {enum: ['INCOME', 'EXPENSE']},
        items: {
          items: {$ref: '#/components/schemas/CategoryDistributionItemDto'},
          type: 'array',
        },
      },
    });
    expect(document.paths?.['/reports/categories/distribution']?.get?.parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({name: 'period', required: true}),
        expect.objectContaining({name: 'type', required: true}),
      ]),
    );
  });
});

import {
  HttpStatus,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {ThrottlerModule} from '@nestjs/throttler';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {configureHttp} from '../common/http/configure-http';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {AccountsController} from './accounts.controller';
import {AccountsService} from './accounts.service';

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

class SetPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    http.getRequest<AuthenticatedRequest>().auth = {publicId: 'user-public-id'};
    return true;
  }
}

const CREATE_BODY = {
  name: 'Ahorros',
  type: 'SAVINGS',
  initialBalance: 500000,
};

const UPDATE_BODY = {
  name: 'Ahorros actualizados',
  version: 0,
};

const PIN_BODY = {pinToHome: true};

describe('AccountsController rate limits (US-301/US-302/US-304)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          // Fail-closed defaults prove the route skipped every bucket except `read`.
          throttlers: [
            {name: 'ip', limit: 1, ttl: 60_000},
            {name: 'identity', limit: 1, ttl: 60_000},
            {name: 'user', limit: 1, ttl: 60_000},
            {name: 'read', limit: 1, ttl: 60_000},
          ],
          setHeaders: false,
        }),
      ],
      controllers: [AccountsController],
      providers: [
        {
          provide: AccountsService,
          useValue: {
            list: jest.fn().mockResolvedValue({items: [], summary: {}}),
            create: jest.fn().mockResolvedValue({publicId: 'created-account'}),
            findOne: jest.fn().mockResolvedValue({publicId: 'account-public-id'}),
            update: jest.fn().mockResolvedValue({publicId: 'account-public-id'}),
            setPin: jest.fn().mockResolvedValue({publicId: 'account-public-id'}),
          },
        },
        AuthRateLimitGuard,
        {provide: APP_GUARD, useClass: SetPrincipalGuard},
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('uses the 300 requests per minute read bucket', () => {
    expect(RATE_LIMITS.read.user).toEqual({limit: 300, ttl: 60_000});
  });

  it('rejects reads above the configured per-user budget', async () => {
    for (let attempt = 0; attempt < RATE_LIMITS.read.user.limit; attempt += 1) {
      await request(app.getHttpServer())
        .get('/accounts')
        .set('X-Forwarded-For', '203.0.113.71')
        .expect(HttpStatus.OK);
    }

    // A different IP still shares the authenticated principal's bucket.
    const response = await request(app.getHttpServer())
      .get('/accounts')
      .set('X-Forwarded-For', '203.0.113.72')
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(response.body.error).toMatchObject({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: API_ERROR_MESSAGES.RATE_LIMITED,
      details: {retryAfterSeconds: expect.any(Number)},
    });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('uses the 120 requests per minute user bucket for creation', () => {
    expect(RATE_LIMITS.mutation.user).toEqual({limit: 120, ttl: 60_000});
  });

  it('rejects account creation above the configured per-user budget', async () => {
    for (let attempt = 0; attempt < RATE_LIMITS.mutation.user.limit; attempt += 1) {
      await request(app.getHttpServer())
        .post('/accounts')
        .send(CREATE_BODY)
        .set('X-Forwarded-For', '203.0.113.81')
        .expect(HttpStatus.CREATED);
    }

    const response = await request(app.getHttpServer())
      .post('/accounts')
      .send(CREATE_BODY)
      .set('X-Forwarded-For', '203.0.113.82')
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(response.body.error).toMatchObject({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: API_ERROR_MESSAGES.RATE_LIMITED,
      details: {retryAfterSeconds: expect.any(Number)},
    });
  });

  it('rejects account detail reads above the configured per-user budget', async () => {
    for (let attempt = 0; attempt < RATE_LIMITS.read.user.limit; attempt += 1) {
      await request(app.getHttpServer())
        .get('/accounts/account-public-id')
        .set('X-Forwarded-For', '203.0.113.73')
        .expect(HttpStatus.OK);
    }

    const response = await request(app.getHttpServer())
      .get('/accounts/account-public-id')
      .set('X-Forwarded-For', '203.0.113.74')
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  it('rejects account updates above the configured per-user budget', async () => {
    for (let attempt = 0; attempt < RATE_LIMITS.mutation.user.limit; attempt += 1) {
      await request(app.getHttpServer())
        .patch('/accounts/account-public-id')
        .send(UPDATE_BODY)
        .set('X-Forwarded-For', '203.0.113.83')
        .expect(HttpStatus.OK);
    }

    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id')
      .send(UPDATE_BODY)
      .set('X-Forwarded-For', '203.0.113.84')
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(response.body.error.code).toBe('RATE_LIMITED');
  });

  it('rejects account pinning above the configured per-user budget', async () => {
    for (let attempt = 0; attempt < RATE_LIMITS.mutation.user.limit; attempt += 1) {
      await request(app.getHttpServer())
        .patch('/accounts/account-public-id/pin')
        .send(PIN_BODY)
        .set('X-Forwarded-For', '203.0.113.85')
        .expect(HttpStatus.OK);
    }

    const response = await request(app.getHttpServer())
      .patch('/accounts/account-public-id/pin')
      .send(PIN_BODY)
      .set('X-Forwarded-For', '203.0.113.86')
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(response.body.error.code).toBe('RATE_LIMITED');
  });
});

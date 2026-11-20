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
import {EnvelopeStream} from '../common/http/envelope-stream';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {UserDataExportService} from './services/user-data-export.service';
import {UsersController} from './users.controller';
import {UsersService} from './users.service';

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

const USER_RESPONSE = {
  publicId: 'user-public-id',
  email: 'user@example.com',
  name: 'Manuel',
  createdAt: '2026-11-19T12:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
};

/** Stands in for the global access guard, which attaches the principal (D86). */
class SetPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.auth = {publicId: 'user-public-id'};
    return true;
  }
}

type RequestMethod = 'get' | 'patch' | 'delete';

const CASES: ReadonlyArray<{
  name: string;
  method: RequestMethod;
  path: string;
  body?: object;
  allowedStatus: HttpStatus;
}> = [
  {
    name: 'GET /users/me/export',
    method: 'get',
    path: '/users/me/export',
    allowedStatus: HttpStatus.OK,
  },
  {
    name: 'PATCH /users/me',
    method: 'patch',
    path: '/users/me',
    body: {name: 'Ana'},
    allowedStatus: HttpStatus.OK,
  },
  {
    name: 'PATCH /users/me/password',
    method: 'patch',
    path: '/users/me/password',
    body: {currentPassword: 'correct horse battery', newPassword: 'a new correct horse'},
    allowedStatus: HttpStatus.NO_CONTENT,
  },
  {
    name: 'DELETE /users/me',
    method: 'delete',
    path: '/users/me',
    body: {password: 'correct horse battery'},
    allowedStatus: HttpStatus.NO_CONTENT,
  },
];

describe('UsersController rate limits (US-207/US-208)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          // Mirror production: unnamed policies fail closed at 1 until a route skips them.
          throttlers: [
            {name: 'ip', limit: 1, ttl: 60_000},
            {name: 'identity', limit: 1, ttl: 60_000},
            {name: 'user', limit: 1, ttl: 60_000},
            {name: 'read', limit: 1, ttl: 60_000},
          ],
          setHeaders: false,
        }),
      ],
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            update: jest.fn().mockResolvedValue(USER_RESPONSE),
            changePassword: jest.fn().mockResolvedValue(undefined),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UserDataExportService,
          useValue: {
            exportData: jest.fn(
              (_publicId: string) =>
                new EnvelopeStream(
                  (async function* () {
                    yield JSON.stringify({data: {}, error: null});
                  })(),
                ),
            ),
          },
        },
        AuthRateLimitGuard,
        {provide: APP_GUARD, useClass: SetPrincipalGuard},
      ],
    }).compile();

    app = moduleRef.createNestApplication({bodyParser: false});
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('defines the read bucket as 300 requests per minute', () => {
    expect(RATE_LIMITS.read.user).toEqual({limit: 300, ttl: 60_000});
  });

  const send = (method: RequestMethod, path: string, body?: object) => {
    const http = request(app.getHttpServer());
    if (method === 'get') {
      return http.get(path);
    }
    return method === 'patch' ? http.patch(path).send(body) : http.delete(path).send(body);
  };

  it.each(CASES)('limits $name to its configured per-user bucket', async (item) => {
    const limit =
      item.method === 'get'
        ? RATE_LIMITS.read.user.limit
        : RATE_LIMITS.mutation.user.limit;

    // Repeating the same IP proves the fail-closed ip bucket was skipped.
    for (let attempt = 0; attempt < limit; attempt += 1) {
      await send(item.method, item.path, item.body)
        .set('X-Forwarded-For', '203.0.113.70')
        .expect(item.allowedStatus);
    }

    const response = await send(item.method, item.path, item.body)
      .set('X-Forwarded-For', '203.0.113.70')
      .expect(HttpStatus.TOO_MANY_REQUESTS);

    expect(response.body.error).toMatchObject({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: API_ERROR_MESSAGES.RATE_LIMITED,
      details: {retryAfterSeconds: expect.any(Number)},
      correlationId: expect.any(String),
    });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });
});

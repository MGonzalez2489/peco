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
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {CategoriesController} from './categories.controller';
import {CategoriesService} from './categories.service';

const CATEGORIES = [
  {
    publicId: 'root-public-id',
    name: 'unknown',
    displayName: 'Otros',
    icon: 'folder-open',
    color: '#6B7280',
    applyType: 'BOTH',
    isRoot: true,
    isSystem: false,
    createdAt: '2026-11-21T10:00:00.000Z',
    updatedAt: '2026-11-21T10:00:00.000Z',
  },
];

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('CategoriesController HTTP contract (US-401)', () => {
  let app: INestApplication;
  let list: jest.Mock;
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
    list = jest.fn().mockResolvedValue(CATEGORIES);

    const moduleRef = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {provide: CategoriesService, useValue: {list}},
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

  it('returns categories in `data` with the list envelope metadata', async () => {
    const response = await request(app.getHttpServer()).get('/categories').expect(200);

    expect(response.body).toEqual({
      data: CATEGORIES,
      meta: {correlationId: expect.any(String)},
      error: null,
    });
    expect(list).toHaveBeenCalledWith('user-public-id');
  });

  it('returns 404 NOT_FOUND when the authenticated user has been deleted', async () => {
    list.mockRejectedValueOnce(userNotFoundException());

    const response = await request(app.getHttpServer()).get('/categories').expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('returns 401 UNAUTHORIZED when the guard did not attach a principal', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer()).get('/categories').expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: API_ERROR_MESSAGES.UNAUTHORIZED,
    });
    expect(list).not.toHaveBeenCalled();
  });
});

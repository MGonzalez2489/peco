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
import {CategoriesController} from './categories.controller';
import {CategoriesService} from './categories.service';
import {categoryNameTakenException} from './utils/category-name-taken.exception';
import {categoryNotFoundException} from './utils/category-not-found.exception';
import {categorySystemProtectedException} from './utils/category-system-protected.exception';

const CATEGORY = {
  publicId: 'category-public-id',
  name: 'cafe',
  displayName: 'Café',
  icon: 'coffee',
  color: '#F97316',
  applyType: 'EXPENSE',
  isRoot: false,
  isSystem: false,
  createdAt: '2026-11-21T10:00:00.000Z',
  updatedAt: '2026-11-21T10:00:00.000Z',
};

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

const CREATE_BODY = {
  displayName: 'Café',
  icon: 'coffee',
  color: '#F97316',
  applyType: 'EXPENSE',
};

const UPDATE_BODY = {
  displayName: 'Café con Leche',
  color: '#10B981',
  applyType: 'BOTH',
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('CategoriesController HTTP contract (US-401/US-402)', () => {
  let app: INestApplication;
  let list: jest.Mock;
  let create: jest.Mock;
  let update: jest.Mock;
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
    create = jest.fn().mockResolvedValue(CATEGORY);
    update = jest.fn().mockResolvedValue(CATEGORY);

    const moduleRef = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {provide: CategoriesService, useValue: {list, create, update}},
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

  it('creates a category and returns 201 with the single-resource envelope', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .send(CREATE_BODY)
      .expect(201);

    expect(response.body).toEqual({data: CATEGORY, error: null});
    expect(create).toHaveBeenCalledWith('user-public-id', CREATE_BODY);
  });

  it('updates a category and returns 200 with the single-resource envelope', async () => {
    const response = await request(app.getHttpServer())
      .patch('/categories/category-public-id')
      .send(UPDATE_BODY)
      .expect(200);

    expect(response.body).toEqual({data: CATEGORY, error: null});
    expect(update).toHaveBeenCalledWith('user-public-id', 'category-public-id', UPDATE_BODY);
  });

  it('rejects server-owned fields on create and update', async () => {
    const forbidden = {name: 'cafe', isRoot: true, isSystem: true, userId: 7};

    const createResponse = await request(app.getHttpServer())
      .post('/categories')
      .send({...CREATE_BODY, ...forbidden})
      .expect(400);
    const updateResponse = await request(app.getHttpServer())
      .patch('/categories/category-public-id')
      .send({...UPDATE_BODY, ...forbidden})
      .expect(400);

    for (const response of [createResponse, updateResponse]) {
      expect(response.body.error).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      });
      expect(response.body.error.details.fields).toMatchObject({
        name: VALIDATION_FIELD_MESSAGES.whitelistValidation,
        isRoot: VALIDATION_FIELD_MESSAGES.whitelistValidation,
        isSystem: VALIDATION_FIELD_MESSAGES.whitelistValidation,
        userId: VALIDATION_FIELD_MESSAGES.whitelistValidation,
      });
    }
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an invalid color and a TRANSFER applyType', async () => {
    const response = await request(app.getHttpServer())
      .post('/categories')
      .send({...CREATE_BODY, color: 'naranja', applyType: 'TRANSFER'})
      .expect(400);

    expect(response.body.error.details.fields).toMatchObject({
      color: VALIDATION_FIELD_MESSAGES.matches,
      applyType: VALIDATION_FIELD_MESSAGES.isIn,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('maps a duplicate active name to 409 CATEGORY_NAME_TAKEN', async () => {
    create.mockRejectedValueOnce(categoryNameTakenException());

    const response = await request(app.getHttpServer())
      .post('/categories')
      .send({...CREATE_BODY, displayName: 'Cafe'})
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'CATEGORY_NAME_TAKEN',
      message: API_ERROR_MESSAGES.CATEGORY_NAME_TAKEN,
    });
  });

  it('maps a system or root update to 409 CATEGORY_SYSTEM_PROTECTED', async () => {
    update.mockRejectedValueOnce(categorySystemProtectedException());

    const response = await request(app.getHttpServer())
      .patch('/categories/root-public-id')
      .send(UPDATE_BODY)
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'CATEGORY_SYSTEM_PROTECTED',
      message: API_ERROR_MESSAGES.CATEGORY_SYSTEM_PROTECTED,
    });
  });

  it('maps a foreign or missing category to 404 NOT_FOUND', async () => {
    update.mockRejectedValueOnce(categoryNotFoundException());

    const response = await request(app.getHttpServer())
      .patch('/categories/foreign-public-id')
      .send(UPDATE_BODY)
      .expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
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

  const expectUnauthorized = (body: unknown): void => {
    expect(body).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: API_ERROR_MESSAGES.UNAUTHORIZED,
    });
    expect(list).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  };

  it('returns 401 UNAUTHORIZED on an unauthenticated list', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer()).get('/categories').expect(401);

    expectUnauthorized(response.body.error);
  });

  it('returns 401 UNAUTHORIZED on an unauthenticated create', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer())
      .post('/categories')
      .send(CREATE_BODY)
      .expect(401);

    expectUnauthorized(response.body.error);
  });

  it('returns 401 UNAUTHORIZED on an unauthenticated update', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer())
      .patch('/categories/category-public-id')
      .send(UPDATE_BODY)
      .expect(401);

    expectUnauthorized(response.body.error);
  });
});

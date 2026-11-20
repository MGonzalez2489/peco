import {
  HttpStatus,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {ApiException} from '../common/http/api-exception';
import {configureHttp} from '../common/http/configure-http';
import {EnvelopeStream} from '../common/http/envelope-stream';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {invalidCredentialsException} from '../auth/utils/invalid-credentials.exception';
import {incorrectPasswordException} from './utils/incorrect-password.exception';
import {UserDataExportService} from './services/user-data-export.service';
import {UsersController} from './users.controller';
import {UsersService} from './users.service';
import {userNotFoundException} from './utils/user-not-found.exception';

const USER_RESPONSE = {
  publicId: 'user-public-id',
  email: 'user@example.com',
  name: 'Manuel',
  createdAt: '2026-11-19T12:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
};

const EXPORT_DOCUMENT = {
  exportedAt: '2026-11-20T10:00:00.000Z',
  schemaVersion: 1,
  user: USER_RESPONSE,
  preferences: {
    theme: 'system',
    pwaBannerDismissedAt: null,
    accounts: {hideBalance: false},
    movements: {hideReversal: false},
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
  accounts: [],
  categories: [],
  movements: [],
  scheduledTransactions: [],
  scheduledExecutions: [],
  periodSnapshots: [],
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('UsersController HTTP contract (US-207/US-208)', () => {
  let app: INestApplication;
  let update: jest.Mock;
  let remove: jest.Mock;
  let changePassword: jest.Mock;
  let exportData: jest.Mock;
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
    update = jest.fn().mockResolvedValue(USER_RESPONSE);
    remove = jest.fn().mockResolvedValue(undefined);
    changePassword = jest.fn().mockResolvedValue(undefined);
    exportData = jest.fn(
      (_publicId: string, correlationId: string) =>
        new EnvelopeStream(
          (async function* () {
            yield JSON.stringify({data: EXPORT_DOCUMENT, meta: {correlationId}});
          })(),
        ),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {provide: UsersService, useValue: {update, remove, changePassword}},
        {provide: UserDataExportService, useValue: {exportData}},
        {provide: APP_GUARD, useValue: authGuard},
      ],
    })
      .overrideGuard(AuthRateLimitGuard)
      .useValue({canActivate: () => true})
      .compile();

    app = moduleRef.createNestApplication({bodyParser: false});
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('streams the full export inside the standard envelope', async () => {
    const response = await request(app.getHttpServer()).get('/users/me/export').expect(200);
    const correlationId = response.headers['x-correlation-id'];

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.body).toEqual({data: EXPORT_DOCUMENT, meta: {correlationId}});
    expect(exportData).toHaveBeenCalledWith('user-public-id', correlationId);
  });

  it('returns 404 NOT_FOUND when the exported user has been deleted', async () => {
    exportData.mockRejectedValueOnce(userNotFoundException());

    const response = await request(app.getHttpServer()).get('/users/me/export').expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('returns 401 UNAUTHORIZED when the export has no principal', async () => {
    authenticated = false;

    await request(app.getHttpServer()).get('/users/me/export').expect(401);

    expect(exportData).not.toHaveBeenCalled();
  });

  it('returns 200 with the updated profile and the authenticated principal', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .send({name: 'Ana'})
      .expect(200);

    expect(response.body).toEqual({data: USER_RESPONSE, meta: {correlationId: expect.any(String)}});
    expect(update).toHaveBeenCalledWith('user-public-id', {name: 'Ana'});
  });

  it('returns 200 without changing anything when no name is supplied', async () => {
    await request(app.getHttpServer()).patch('/users/me').send({}).expect(200);

    expect(update).toHaveBeenCalledWith('user-public-id', {});
  });

  it.each([{name: ''}, {name: 'x'.repeat(81)}, {name: 42}, {name: null}])(
    'returns 400 VALIDATION_ERROR for the invalid name %p',
    async (body: {name: unknown}) => {
      const response = await request(app.getHttpServer()).patch('/users/me').send(body).expect(400);

      expect(response.body.error).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: {fields: {name: expect.any(String)}},
      });
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('rejects attempts to change the immutable email', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .send({email: 'other@example.com'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {email: expect.any(String)}},
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 404 NOT_FOUND when the user has already been deleted', async () => {
    update.mockRejectedValue(userNotFoundException());

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .send({name: 'Ana'})
      .expect(404);

    expect(response.body.error).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: API_ERROR_MESSAGES.NOT_FOUND,
    });
  });

  it('returns 401 UNAUTHORIZED when the guard did not attach a principal', async () => {
    authenticated = false;

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .send({name: 'Ana'})
      .expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: API_ERROR_MESSAGES.UNAUTHORIZED,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('returns 204 with no body when the password change succeeds', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({currentPassword: 'correct horse battery', newPassword: 'a new correct horse'})
      .expect(204);

    expect(response.text).toBe('');
    expect(response.body).toEqual({});
    expect(changePassword).toHaveBeenCalledWith('user-public-id', {
      currentPassword: 'correct horse battery',
      newPassword: 'a new correct horse',
    });
  });

  it.each([
    {currentPassword: 'short', newPassword: 'a new correct horse'},
    {currentPassword: 'correct horse battery', newPassword: ''},
    {currentPassword: 42, newPassword: 'a new correct horse'},
    {currentPassword: 'correct horse battery'},
  ])('returns 400 VALIDATION_ERROR for the invalid password change %p', async (body) => {
    const response = await request(app.getHttpServer())
      .patch('/users/me/password')
      .send(body)
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: expect.any(Object)},
    });
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('returns 401 UNAUTHORIZED for a wrong current password', async () => {
    changePassword.mockRejectedValue(incorrectPasswordException());

    const response = await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({currentPassword: 'wrong-password', newPassword: 'a new correct horse'})
      .expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: API_ERROR_MESSAGES.UNAUTHORIZED,
    });
  });

  it('returns 404 NOT_FOUND when the authenticated user is gone', async () => {
    changePassword.mockRejectedValue(userNotFoundException());

    await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({currentPassword: 'correct horse battery', newPassword: 'a new correct horse'})
      .expect(404);
  });

  it('returns 401 UNAUTHORIZED when the guard did not attach a principal', async () => {
    authenticated = false;

    await request(app.getHttpServer())
      .patch('/users/me/password')
      .send({currentPassword: 'correct horse battery', newPassword: 'a new correct horse'})
      .expect(401);

    expect(changePassword).not.toHaveBeenCalled();
  });

  it('returns 204 with no body for a password-confirmed deletion', async () => {
    const response = await request(app.getHttpServer())
      .delete('/users/me')
      .send({password: 'correct horse battery'})
      .expect(204);

    expect(response.text).toBe('');
    expect(response.body).toEqual({});
    expect(remove).toHaveBeenCalledWith('user-public-id', {password: 'correct horse battery'});
  });

  it.each([{password: ''}, {password: 'short'}, {password: 42}])(
    'returns 400 VALIDATION_ERROR for the invalid password %p',
    async (body: {password: unknown}) => {
      const response = await request(app.getHttpServer())
        .delete('/users/me')
        .send(body)
        .expect(400);

      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        details: {fields: {password: expect.any(String)}},
      });
      expect(remove).not.toHaveBeenCalled();
    },
  );

  it('returns 401 INVALID_CREDENTIALS for a wrong password', async () => {
    remove.mockRejectedValue(invalidCredentialsException());

    const response = await request(app.getHttpServer())
      .delete('/users/me')
      .send({password: 'wrong-password'})
      .expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
    });
  });

  it('returns 404 NOT_FOUND for a repeated deletion', async () => {
    remove.mockRejectedValue(
      new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', API_ERROR_MESSAGES.NOT_FOUND),
    );

    await request(app.getHttpServer())
      .delete('/users/me')
      .send({password: 'correct horse battery'})
      .expect(404);
  });
});

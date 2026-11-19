import {HttpStatus} from '@nestjs/common';
import type {INestApplication, LoggerService} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {ApiException} from '../common/http/api-exception';
import {configureHttp} from '../common/http/configure-http';
import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {invalidCredentialsException} from './utils/invalid-credentials.exception';
import {invalidResetTokenException} from './utils/invalid-reset-token.exception';

const VALID_BODY = {
  email: 'user@example.com',
  password: 'correct horse battery',
  name: 'Manuel',
};

const AUTH_RESPONSE = {
  user: {
    publicId: 'user-public-id',
    email: 'user@example.com',
    name: 'Manuel',
    createdAt: '2026-11-18T12:00:00.000Z',
    updatedAt: '2026-11-18T12:00:00.000Z',
  },
  accessToken: 'jwt',
  refreshToken: 'refresh',
  expiresIn: 900,
  refreshExpiresIn: 1800,
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('AuthController HTTP contract (US-201/US-202/US-203/US-204/US-205)', () => {
  let app: INestApplication;
  let register: jest.Mock;
  let login: jest.Mock;
  let refresh: jest.Mock;
  let logout: jest.Mock;
  let forgotPassword: jest.Mock;
  let resetPassword: jest.Mock;

  beforeEach(async () => {
    register = jest.fn().mockResolvedValue(AUTH_RESPONSE);
    login = jest.fn().mockResolvedValue(AUTH_RESPONSE);
    refresh = jest.fn().mockResolvedValue(AUTH_RESPONSE);
    logout = jest.fn().mockResolvedValue(undefined);
    forgotPassword = jest.fn().mockResolvedValue(undefined);
    resetPassword = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {register, login, refresh, logout, forgotPassword, resetPassword},
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({bodyParser: false});
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 201 with the auto-login payload and a normalized email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({...VALID_BODY, email: '  USER@Example.COM '})
      .expect(201);

    expect(response.body).toEqual({data: AUTH_RESPONSE, meta: {correlationId: expect.any(String)}});
    expect(register).toHaveBeenCalledWith(
      expect.objectContaining({email: 'user@example.com', name: 'Manuel'}),
    );
  });

  it('returns 400 with details.fields for a short password and a malformed email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({email: 'not-an-email', password: 'short', name: 'Manuel'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: {email: expect.any(String), password: expect.any(String)}},
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('returns 409 EMAIL_ALREADY_REGISTERED for a reserved email', async () => {
    register.mockRejectedValue(
      new ApiException(
        HttpStatus.CONFLICT,
        'EMAIL_ALREADY_REGISTERED',
        API_ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send(VALID_BODY)
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
      message: API_ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
      correlationId: expect.any(String),
    });
  });

  it('returns 200 with the same payload for login and normalizes the email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({email: '  USER@Example.COM ', password: 'correct horse battery'})
      .expect(200);

    expect(response.body).toEqual({data: AUTH_RESPONSE, meta: {correlationId: expect.any(String)}});
    expect(login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'correct horse battery',
    });
    expect(register).not.toHaveBeenCalled();
  });

  it('returns 400 with details.fields for malformed login input', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({email: 'not-an-email', password: 'short'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {email: expect.any(String), password: expect.any(String)}},
    });
    expect(login).not.toHaveBeenCalled();
  });

  it('returns 401 INVALID_CREDENTIALS with the shared error envelope', async () => {
    login.mockRejectedValue(invalidCredentialsException());

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({email: VALID_BODY.email, password: 'wrong-password'})
      .expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
      message: API_ERROR_MESSAGES.INVALID_CREDENTIALS,
      correlationId: expect.any(String),
    });
  });

  it('rejects injected identity fields instead of refreshing another session', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({refreshToken: 'raw-refresh-token', userId: 99, publicId: 'other-user'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {userId: expect.any(String), publicId: expect.any(String)}},
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns 200 with the same payload for a valid refresh', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({refreshToken: 'raw-refresh-token'})
      .expect(200);

    expect(response.body).toEqual({data: AUTH_RESPONSE, meta: {correlationId: expect.any(String)}});
    expect(refresh).toHaveBeenCalledWith({refreshToken: 'raw-refresh-token'});
    expect(login).not.toHaveBeenCalled();
  });

  it('returns 400 with details.fields for malformed refresh input', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({refreshToken: 42})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {refreshToken: expect.any(String)}},
    });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns 401 REFRESH_TOKEN_REUSED with the shared error envelope', async () => {
    refresh.mockRejectedValue(
      new ApiException(
        HttpStatus.UNAUTHORIZED,
        'REFRESH_TOKEN_REUSED',
        API_ERROR_MESSAGES.REFRESH_TOKEN_REUSED,
      ),
    );

    const response = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({refreshToken: 'replayed-token'})
      .expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'REFRESH_TOKEN_REUSED',
      message: API_ERROR_MESSAGES.REFRESH_TOKEN_REUSED,
      correlationId: expect.any(String),
    });
  });

  it('returns 204 with no body for logout and forwards the refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({refreshToken: 'raw-refresh-token'})
      .expect(204);

    expect(response.text).toBe('');
    expect(response.body).toEqual({});
    expect(logout).toHaveBeenCalledWith({refreshToken: 'raw-refresh-token'});
    expect(refresh).not.toHaveBeenCalled();
  });

  it('returns 400 with details.fields for malformed logout input', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({refreshToken: 42})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {refreshToken: expect.any(String)}},
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it('rejects injected identity fields on logout', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .send({refreshToken: 'raw-refresh-token', userId: 99, publicId: 'other-user'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {userId: expect.any(String), publicId: expect.any(String)}},
    });
    expect(logout).not.toHaveBeenCalled();
  });

  it('returns 204 with no body for forgot-password and normalizes the email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({email: '  USER@Example.COM '})
      .expect(204);

    expect(response.text).toBe('');
    expect(response.body).toEqual({});
    expect(forgotPassword).toHaveBeenCalledWith({email: 'user@example.com'});
  });

  it('returns 400 with details.fields for a malformed forgot-password email', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({email: 'not-an-email'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {email: expect.any(String)}},
    });
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('returns 204 with no body for a valid reset-password request', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({token: 'single-use-token', newPassword: 'correct horse battery'})
      .expect(204);

    expect(response.text).toBe('');
    expect(response.body).toEqual({});
    expect(resetPassword).toHaveBeenCalledWith({
      token: 'single-use-token',
      newPassword: 'correct horse battery',
    });
  });

  it('returns 400 INVALID_RESET_TOKEN for an unusable link', async () => {
    resetPassword.mockRejectedValue(invalidResetTokenException());

    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({token: 'used-token', newPassword: 'correct horse battery'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'INVALID_RESET_TOKEN',
      message: API_ERROR_MESSAGES.INVALID_RESET_TOKEN,
      correlationId: expect.any(String),
    });
  });

  it('returns 400 with details.fields for a short reset password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({token: 'single-use-token', newPassword: 'short'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {newPassword: expect.any(String)}},
    });
    expect(resetPassword).not.toHaveBeenCalled();
  });
});

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

describe('AuthController HTTP contract (US-201/US-202)', () => {
  let app: INestApplication;
  let register: jest.Mock;
  let login: jest.Mock;

  beforeEach(async () => {
    register = jest.fn().mockResolvedValue(AUTH_RESPONSE);
    login = jest.fn().mockResolvedValue(AUTH_RESPONSE);

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{provide: AuthService, useValue: {register, login}}],
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
});

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  type CanActivate,
  type ExecutionContext,
  type INestApplication,
  type LoggerService,
} from '@nestjs/common';
import {APP_GUARD, Reflector} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {versionConflictException} from '../../accounts/utils/version-conflict.exception';
import {API_ERROR_MESSAGES} from '../http/api-error-messages.constant';
import {configureHttp} from '../http/configure-http';
import type {AuthenticatedRequest} from '../types/authenticated-request.type';
import {IDEMPOTENCY_KEY_HEADER} from './constants/idempotency-key-header.constant';
import {IDEMPOTENCY_REPLAYED_HEADER} from './constants/idempotency-replayed-header.constant';
import {RequireIdempotencyKey} from './decorators/require-idempotency-key.decorator';
import {IdempotencyInterceptor} from './interceptors/idempotency.interceptor';
import type {IdempotencyService} from './services/idempotency.service';

const KEY = 'idem-key-12345678';

@Controller('idem-test')
class IdempotencyTestController {
  @Post('required')
  @RequireIdempotencyKey()
  @HttpCode(HttpStatus.CREATED)
  required(@Body() body: {value: string}): {value: string} {
    return {value: body.value};
  }

  @Post('optional')
  optional(): {ok: boolean} {
    return {ok: true};
  }

  @Get('failure')
  @RequireIdempotencyKey()
  failure(): never {
    throw versionConflictException(0, 2);
  }
}

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('IdempotencyInterceptor (US-509, D108)', () => {
  let app: INestApplication;
  let execute: jest.Mock;

  const authGuard: CanActivate = {
    canActivate: (context: ExecutionContext): boolean => {
      context.switchToHttp().getRequest<AuthenticatedRequest>().auth = {
        publicId: 'user-public-id',
      };
      return true;
    },
  };

  beforeEach(async () => {
    execute = jest.fn().mockImplementation(async (_request, run: () => Promise<unknown>) => {
      const handled = (await run()) as {statusCode: number; value: unknown};
      return {kind: 'success', value: handled.value};
    });

    const interceptor = new IdempotencyInterceptor(
      {execute} as unknown as IdempotencyService,
      new Reflector(),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [IdempotencyTestController],
      providers: [{provide: APP_GUARD, useValue: authGuard}],
    }).compile();

    app = moduleRef.createNestApplication();
    configureHttp(app, {logger: SILENT_LOGGER, idempotency: interceptor});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a missing required key with a field error', async () => {
    const response = await request(app.getHttpServer())
      .post('/idem-test/required')
      .send({value: 'fresh'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: API_ERROR_MESSAGES.VALIDATION_ERROR,
      details: {fields: {idempotencyKey: expect.any(String)}},
    });
    expect(execute).not.toHaveBeenCalled();
  });

  it('rejects a key outside the 8–128 character range', async () => {
    const response = await request(app.getHttpServer())
      .post('/idem-test/required')
      .set(IDEMPOTENCY_KEY_HEADER, 'short')
      .send({value: 'fresh'})
      .expect(400);

    expect(response.body.error.details.fields).toHaveProperty('idempotencyKey');
    expect(execute).not.toHaveBeenCalled();
  });

  it('accepts an optional key on a route without the decorator', async () => {
    const response = await request(app.getHttpServer()).post('/idem-test/optional').expect(201);

    expect(response.body).toEqual({data: {ok: true}, error: null});
    expect(execute).not.toHaveBeenCalled();
  });

  it('hashes the method, endpoint and body before executing the handler', async () => {
    const response = await request(app.getHttpServer())
      .post('/idem-test/required')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .send({value: 'fresh'})
      .expect(201);

    expect(response.body).toEqual({data: {value: 'fresh'}, error: null});
    expect(response.headers[IDEMPOTENCY_REPLAYED_HEADER]).toBeUndefined();
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userPublicId: 'user-public-id',
        key: KEY,
        endpoint: expect.stringContaining('POST /idem-test/required'),
        requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        correlationId: expect.any(String),
      }),
      expect.any(Function),
    );
  });

  it('replays a stored envelope with the current correlation id and replay header', async () => {
    execute.mockResolvedValueOnce({
      kind: 'replay',
      statusCode: 200,
      body: {data: {value: 'stored'}, error: null},
    });

    const response = await request(app.getHttpServer())
      .get('/idem-test/failure')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .set('x-correlation-id', '01JC7Z3Q9K')
      .expect(200);

    expect(response.headers[IDEMPOTENCY_REPLAYED_HEADER]).toBe('true');
    expect(response.body).toEqual({data: {value: 'stored'}, error: null});
    expect(response.body.error).toBeNull();
  });

  it('lets the global filter render a failure returned by the service', async () => {
    execute.mockResolvedValueOnce({
      kind: 'failure',
      exception: versionConflictException(0, 2),
    });

    const response = await request(app.getHttpServer())
      .get('/idem-test/failure')
      .set(IDEMPOTENCY_KEY_HEADER, KEY)
      .expect(409);

    expect(response.body.error).toMatchObject({
      statusCode: 409,
      code: 'VERSION_CONFLICT',
      message: API_ERROR_MESSAGES.VERSION_CONFLICT,
      details: {expectedVersion: 0, currentVersion: 2},
    });
  });
});

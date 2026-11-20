import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
} from '@nestjs/common';
import type {INestApplication, LoggerService} from '@nestjs/common';
import {Test} from '@nestjs/testing';
import {IsInt, IsString, Min, MinLength} from 'class-validator';
import request from 'supertest';
import {HealthController} from '../../health/health.controller';
import {HealthService} from '../../health/health.service';
import {ListQueryDto} from '../dto/list-query.dto';
import {API_ERROR_MESSAGES} from './api-error-messages.constant';
import {ApiException} from './api-exception';
import {configureHttp} from './configure-http';
import {EnvelopeResult} from './envelope-result';

const createSilentLogger = (): LoggerService => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
});

class CreateThingDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsInt()
  @Min(1)
  amount!: number;
}

@Controller('test')
class TestController {
  @Get('single')
  single(): {publicId: string; amount: number} {
    return {publicId: 'resource-1', amount: 100};
  }

  @Get('list')
  list(): EnvelopeResult<{publicId: string}[], {count: number; nextCursor: string}> {
    return EnvelopeResult.withMeta([{publicId: 'resource-1'}, {publicId: 'resource-2'}], {
      count: 2,
      nextCursor: 'cursor-1',
    });
  }

  @Get('failure')
  failure(): never {
    throw new ApiException(
      HttpStatus.CONFLICT,
      'VERSION_CONFLICT',
      API_ERROR_MESSAGES.VERSION_CONFLICT,
      {expectedVersion: 3, currentVersion: 4},
    );
  }

  @Get('boom')
  boom(): never {
    throw new Error('SELECT password FROM users WHERE id = 1');
  }

  @Delete('resource')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(): void {
    // 204 responses are bodyless by contract (8.3)
  }

  @Post('validate')
  create(@Body() dto: CreateThingDto): CreateThingDto {
    return dto;
  }

  @Get('items')
  items(@Query() query: ListQueryDto): ListQueryDto {
    return query;
  }
}

describe('HTTP contract (US-104)', () => {
  let app: INestApplication;
  let pingDatabase: jest.Mock;
  let loggerError: jest.SpyInstance;

  beforeEach(async () => {
    pingDatabase = jest.fn().mockResolvedValue(undefined);
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const moduleRef = await Test.createTestingModule({
      controllers: [TestController, HealthController],
      providers: [{provide: HealthService, useValue: {pingDatabase}}],
    }).compile();

    app = moduleRef.createNestApplication({bodyParser: false});
    configureHttp(app, {logger: createSilentLogger()});
    await app.init();
  });

  afterEach(async () => {
    loggerError.mockRestore();
    await app.close();
  });

  describe('success envelope', () => {
    it('wraps a single resource in {data, error}', async () => {
      const response = await request(app.getHttpServer()).get('/test/single').expect(200);

      expect(response.body).toEqual({
        data: {publicId: 'resource-1', amount: 100},
        error: null,
      });
      expect(response.body).not.toHaveProperty('meta');
      expect(response.headers['x-correlation-id']).toEqual(expect.any(String));
    });

    it('keeps the collection in data and pagination in meta', async () => {
      const response = await request(app.getHttpServer()).get('/test/list').expect(200);

      expect(response.body).toEqual({
        data: [{publicId: 'resource-1'}, {publicId: 'resource-2'}],
        meta: {
          correlationId: expect.any(String),
          count: 2,
          nextCursor: 'cursor-1',
        },
        error: null,
      });
    });

    it('keeps 204 responses bodyless', async () => {
      const response = await request(app.getHttpServer()).delete('/test/resource').expect(204);

      expect(response.text).toBe('');
    });
  });

  describe('error envelope', () => {
    it('renders a domain exception with data null, code, Spanish message, details and correlation id', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/failure')
        .set('x-correlation-id', '01JC7Z3Q9K')
        .expect(409);

      expect(response.body).toEqual({
        data: null,
        error: {
          statusCode: 409,
          code: 'VERSION_CONFLICT',
          message: API_ERROR_MESSAGES.VERSION_CONFLICT,
          details: {expectedVersion: 3, currentVersion: 4},
          correlationId: '01JC7Z3Q9K',
        },
      });
    });

    it('maps an unknown route to 404 NOT_FOUND', async () => {
      const response = await request(app.getHttpServer()).get('/does-not-exist').expect(404);

      expect(response.body).toEqual({
        data: null,
        error: {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: API_ERROR_MESSAGES.NOT_FOUND,
          correlationId: expect.any(String),
        },
      });
    });

    it('sanitizes an unhandled exception into 500 INTERNAL_ERROR', async () => {
      const response = await request(app.getHttpServer()).get('/test/boom').expect(500);

      expect(response.body).toEqual({
        data: null,
        error: {
          statusCode: 500,
          code: 'INTERNAL_ERROR',
          message: API_ERROR_MESSAGES.INTERNAL_ERROR,
          correlationId: expect.any(String),
        },
      });
      expect(response.text).not.toContain('SELECT');
      expect(response.text).not.toContain('at ');
      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('500 INTERNAL_ERROR'),
        expect.stringContaining('SELECT password FROM users'),
      );
    });

    it('rejects a JSON body over 1 MB with 413 PAYLOAD_TOO_LARGE', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validate')
        .send({name: 'Café', amount: 1500, padding: 'x'.repeat(1024 * 1024)})
        .expect(413);

      expect(response.body).toEqual({
        data: null,
        error: {
          statusCode: 413,
          code: 'PAYLOAD_TOO_LARGE',
          message: API_ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
          correlationId: expect.any(String),
        },
      });
    });
  });

  describe('correlation id', () => {
    it('reuses a valid inbound correlation id', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/single')
        .set('x-correlation-id', '01JC7Z3Q9K')
        .expect(200);

      expect(response.body).toEqual({
        data: {publicId: 'resource-1', amount: 100},
        error: null,
      });
      expect(response.headers['x-correlation-id']).toBe('01JC7Z3Q9K');
    });

    it('generates a new id when the inbound header is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get('/test/single')
        .set('x-correlation-id', 'short')
        .expect(200);

      expect(response.body).toEqual({
        data: {publicId: 'resource-1', amount: 100},
        error: null,
      });
      expect(response.headers['x-correlation-id']).not.toBe('short');
      expect(response.headers['x-correlation-id']).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('validation', () => {
    it('accepts a valid body', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validate')
        .send({name: 'Café', amount: 1500})
        .expect(201);

      expect(response.body).toEqual({
        data: {name: 'Café', amount: 1500},
        error: null,
      });
    });

    it('rejects invalid fields with details.fields in Spanish', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validate')
        .send({name: 'a', amount: '1500'})
        .expect(400);

      expect(response.body).toEqual({
        data: null,
        error: {
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: API_ERROR_MESSAGES.VALIDATION_ERROR,
          details: {
            fields: {
              name: 'La longitud no es válida.',
              amount: 'Debe ser un número entero.',
            },
          },
          correlationId: expect.any(String),
        },
      });
    });

    it('rejects unknown fields instead of stripping them silently', async () => {
      const response = await request(app.getHttpServer())
        .post('/test/validate')
        .send({name: 'Café', amount: 1500, injected: true})
        .expect(400);

      expect(response.body.error.details.fields).toEqual({
        injected: 'El campo no está permitido.',
      });
    });

    it('accepts a list limit within the D25 bound', async () => {
      const response = await request(app.getHttpServer()).get('/test/items?limit=100').expect(200);

      expect(response.body).toEqual({data: {limit: 100}, error: null});
    });

    it('rejects a list limit above 100 instead of clamping it', async () => {
      const response = await request(app.getHttpServer()).get('/test/items?limit=101').expect(400);

      expect(response.body.error).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        details: {fields: {limit: expect.any(String)}},
      });
      expect(response.body.data).toBeNull();
    });
  });

  describe('health exception', () => {
    it('keeps /health flat on success', async () => {
      const response = await request(app.getHttpServer()).get('/health').expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        uptime: expect.any(Number),
        db: 'up',
      });
    });

    it('keeps /health flat on failure', async () => {
      pingDatabase.mockRejectedValue(new Error('db down'));

      const response = await request(app.getHttpServer()).get('/health').expect(503);

      expect(response.body).toEqual({
        status: 'error',
        uptime: expect.any(Number),
        db: 'down',
      });
    });
  });
});

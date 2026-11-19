import {Body, Controller, HttpStatus, Post, UseGuards} from '@nestjs/common';
import type {INestApplication, LoggerService} from '@nestjs/common';
import {SkipThrottle, Throttle, ThrottlerModule} from '@nestjs/throttler';
import {Test} from '@nestjs/testing';
import type {Express} from 'express';
import request from 'supertest';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {configureHttp} from '../../common/http/configure-http';
import {RateLimited} from '../../common/security/decorators/rate-limited.decorator';
import {AuthRateLimitGuard} from './auth-rate-limit.guard';

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

const rateLimitEnabled = {value: true};

@Controller('probe')
@UseGuards(AuthRateLimitGuard)
class RateLimitedController {
  @Post('login')
  @RateLimited()
  @Throttle({
    ip: {limit: 2, ttl: 60_000},
    identity: {limit: 1, ttl: 60_000},
  })
  login(@Body() body: {email: string}): {email: string} {
    return {email: body.email};
  }

  @Post('plain')
  plain(): {ok: boolean} {
    return {ok: true};
  }

  @Post('reset')
  @RateLimited()
  @SkipThrottle({identity: true})
  @Throttle({ip: {limit: 5, ttl: 60_000}})
  reset(): {ok: boolean} {
    return {ok: true};
  }
}

describe('AuthRateLimitGuard (US-206)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    rateLimitEnabled.value = true;

    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({
          throttlers: [
            {name: 'ip', limit: 99, ttl: 60_000},
            {name: 'identity', limit: 99, ttl: 60_000},
          ],
          setHeaders: false,
          skipIf: () => !rateLimitEnabled.value,
        }),
      ],
      controllers: [RateLimitedController],
      providers: [AuthRateLimitGuard],
    }).compile();

    app = moduleRef.createNestApplication({bodyParser: false});
    (app.getHttpAdapter().getInstance() as Express).set('trust proxy', true);
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const login = (ip: string, email: string) =>
    request(app.getHttpServer()).post('/probe/login').set('X-Forwarded-For', ip).send({email});

  it('limits by IP independently of the submitted email', async () => {
    await login('203.0.113.10', 'one@example.com').expect(HttpStatus.CREATED);
    await login('203.0.113.10', 'two@example.com').expect(HttpStatus.CREATED);

    const response = await login('203.0.113.10', 'three@example.com').expect(
      HttpStatus.TOO_MANY_REQUESTS,
    );

    expect(response.body.error).toMatchObject({
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: 'RATE_LIMITED',
      message: API_ERROR_MESSAGES.RATE_LIMITED,
      details: {retryAfterSeconds: expect.any(Number)},
      correlationId: expect.any(String),
    });
    const retryAfter = Number(response.headers['retry-after']);
    expect(retryAfter).toBeGreaterThan(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('limits by normalized email independently of the source IP', async () => {
    await login('203.0.113.20', '  USER@Example.COM ').expect(HttpStatus.CREATED);

    const response = await login('203.0.113.21', 'user@example.com').expect(
      HttpStatus.TOO_MANY_REQUESTS,
    );

    expect(response.body.error).toMatchObject({code: 'RATE_LIMITED'});
  });

  it('does not count routes without @RateLimited()', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/probe/plain')
        .set('X-Forwarded-For', '203.0.113.30')
        .expect(HttpStatus.CREATED);
    }
  });

  it('honors @SkipThrottle({identity: true}) while keeping the IP policy', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/probe/reset')
        .set('X-Forwarded-For', '203.0.113.40')
        .send({email: 'user@example.com'})
        .expect(HttpStatus.CREATED);
    }

    await request(app.getHttpServer())
      .post('/probe/reset')
      .set('X-Forwarded-For', '203.0.113.40')
      .send({email: 'user@example.com'})
      .expect(HttpStatus.TOO_MANY_REQUESTS);
  });

  it('skips every policy when rate limiting is disabled', async () => {
    rateLimitEnabled.value = false;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login('203.0.113.50', 'user@example.com').expect(HttpStatus.CREATED);
    }
  });
});

import {Controller, Get, Req} from '@nestjs/common';
import type {INestApplication, LoggerService} from '@nestjs/common';
import {APP_GUARD} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import request from 'supertest';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {configureHttp} from '../../common/http/configure-http';
import {Public} from '../../common/security/decorators/public.decorator';
import type {AuthenticatedRequest} from '../../common/types/authenticated-request.type';
import {TokenService} from '../services/token-service';
import {UserActivityRepository} from '../services/user-activity.repository';
import {tokenExpiredException} from '../utils/token-expired.exception';
import {unauthorizedException} from '../utils/unauthorized.exception';
import {AccessTokenGuard} from './access-token.guard';

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

@Controller('probe')
class ProbeController {
  @Get('public')
  @Public()
  publicRoute(): {scope: string} {
    return {scope: 'public'};
  }

  @Get('protected')
  protectedRoute(@Req() req: AuthenticatedRequest): {publicId: string | undefined} {
    return {publicId: req.auth?.publicId};
  }
}

describe('AccessTokenGuard (US-206)', () => {
  let app: INestApplication;
  let verifyAccessToken: jest.Mock;
  let touch: jest.Mock;

  beforeEach(async () => {
    verifyAccessToken = jest.fn().mockResolvedValue({sub: 'user-public-id'});
    touch = jest.fn().mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
      providers: [
        {provide: TokenService, useValue: {verifyAccessToken}},
        {provide: UserActivityRepository, useValue: {touch}},
        {provide: APP_GUARD, useClass: AccessTokenGuard},
      ],
    }).compile();

    app = moduleRef.createNestApplication({bodyParser: false});
    configureHttp(app, {logger: SILENT_LOGGER});
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows a public route without a token and skips verification and activity', async () => {
    const response = await request(app.getHttpServer()).get('/probe/public').expect(200);

    expect(response.body.data).toEqual({scope: 'public'});
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(touch).not.toHaveBeenCalled();
  });

  it('rejects a protected route without an authorization header', async () => {
    const response = await request(app.getHttpServer()).get('/probe/protected').expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: API_ERROR_MESSAGES.UNAUTHORIZED,
      correlationId: expect.any(String),
    });
    expect(verifyAccessToken).not.toHaveBeenCalled();
    expect(touch).not.toHaveBeenCalled();
  });

  it.each(['Basic jwt-token', 'Bearer', 'Bearer one two', 'Token jwt-token'])(
    'rejects the malformed authorization header %s',
    async (header) => {
      const response = await request(app.getHttpServer())
        .get('/probe/protected')
        .set('Authorization', header)
        .expect(401);

      expect(response.body.error).toMatchObject({code: 'UNAUTHORIZED'});
      expect(verifyAccessToken).not.toHaveBeenCalled();
      expect(touch).not.toHaveBeenCalled();
    },
  );

  it('verifies a bearer token, exposes the subject and touches activity', async () => {
    const response = await request(app.getHttpServer())
      .get('/probe/protected')
      .set('Authorization', 'Bearer jwt-token')
      .expect(200);

    expect(response.body.data).toEqual({publicId: 'user-public-id'});
    expect(verifyAccessToken).toHaveBeenCalledWith('jwt-token');
    expect(touch).toHaveBeenCalledWith('user-public-id');
  });

  it('accepts a lowercase bearer scheme', async () => {
    await request(app.getHttpServer())
      .get('/probe/protected')
      .set('Authorization', 'bearer jwt-token')
      .expect(200);

    expect(verifyAccessToken).toHaveBeenCalledWith('jwt-token');
  });

  it('returns 401 TOKEN_EXPIRED and skips activity when the token expired', async () => {
    verifyAccessToken.mockRejectedValue(tokenExpiredException());

    const response = await request(app.getHttpServer())
      .get('/probe/protected')
      .set('Authorization', 'Bearer expired-jwt')
      .expect(401);

    expect(response.body.error).toMatchObject({
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: API_ERROR_MESSAGES.TOKEN_EXPIRED,
    });
    expect(touch).not.toHaveBeenCalled();
  });

  it('skips activity when verification rejects an invalid token', async () => {
    verifyAccessToken.mockRejectedValue(unauthorizedException());

    await request(app.getHttpServer())
      .get('/probe/protected')
      .set('Authorization', 'Bearer invalid-jwt')
      .expect(401);

    expect(touch).not.toHaveBeenCalled();
  });
});

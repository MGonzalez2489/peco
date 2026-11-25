import type {PreferencesResponse, UpdatePreferencesRequest} from '@peco/contracts';
import {AppThemeEnum} from '@peco/enums';
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
import {configureHttp} from '../common/http/configure-http';
import {createOpenApiDocument} from '../common/openapi/create-open-api-document';
import type {AuthenticatedRequest} from '../common/types/authenticated-request.type';
import {PreferencesController} from './preferences.controller';
import {PreferencesService} from './services/preferences.service';
import {normalizePreferencesPatch} from './utils/normalize-preferences-patch.util';

const PREFERENCES: PreferencesResponse = {
  theme: AppThemeEnum.SYSTEM.toString(),
  pwaBannerDismissedAt: null,
  accounts: {hideBalance: false},
  movements: {hideReversal: true},
  updatedAt: '2026-11-25T10:00:00.000Z',
};

const SILENT_LOGGER: LoggerService = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  fatal: jest.fn(),
};

describe('PreferencesController HTTP contract (US-901)', () => {
  let app: INestApplication;
  let find: jest.Mock;
  let update: jest.Mock;
  let authenticated = true;

  const authGuard: CanActivate = {
    canActivate: (context: ExecutionContext): boolean => {
      if (authenticated) {
        context.switchToHttp().getRequest<AuthenticatedRequest>().auth = {
          publicId: 'user-public-id',
          previousLastActiveAt: null,
        };
      }

      return true;
    },
  };

  beforeEach(async () => {
    authenticated = true;
    find = jest.fn().mockResolvedValue(PREFERENCES);
    update = jest.fn().mockResolvedValue(PREFERENCES);

    const moduleRef = await Test.createTestingModule({
      controllers: [PreferencesController],
      providers: [
        {provide: PreferencesService, useValue: {find, update}},
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

  it('returns the full preference object in the standard envelope', async () => {
    const response = await request(app.getHttpServer()).get('/preferences').expect(200);

    expect(response.body).toEqual({data: PREFERENCES, error: null});
    expect(find).toHaveBeenCalledWith('user-public-id');
  });

  it('deep-merges a partial body and returns the merged object', async () => {
    const response = await request(app.getHttpServer())
      .patch('/preferences')
      .send({theme: AppThemeEnum.DARK.toString(), accounts: {hideBalance: true}})
      .expect(200);

    expect(response.body).toEqual({data: PREFERENCES, error: null});
    expect(update).toHaveBeenCalledWith('user-public-id', {
      theme: AppThemeEnum.DARK.toString(),
      accounts: {hideBalance: true},
    });
  });

  it('rejects unknown top-level fields with 400 VALIDATION_ERROR', async () => {
    const response = await request(app.getHttpServer())
      .patch('/preferences')
      .send({theme: 'dark', injected: true})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {injected: 'El campo no está permitido.'}},
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects unknown nested fields with a dotted details key', async () => {
    const response = await request(app.getHttpServer())
      .patch('/preferences')
      .send({accounts: {hideBalance: true, injected: true}})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {'accounts.injected': 'El campo no está permitido.'}},
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('ignores wrong-typed fields instead of failing the request', async () => {
    await request(app.getHttpServer())
      .patch('/preferences')
      .send({
        theme: 42,
        pwaBannerDismissedAt: 123,
        accounts: 'not-a-section',
        movements: {hideReversal: 'true'},
      })
      .expect(200);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0]).toBe('user-public-id');
    expect(normalizePreferencesPatch(update.mock.calls[0][1] as UpdatePreferencesRequest)).toEqual(
      {},
    );
  });

  it('accepts an explicit null to restore the PWA banner', async () => {
    await request(app.getHttpServer())
      .patch('/preferences')
      .send({pwaBannerDismissedAt: null})
      .expect(200);

    expect(
      normalizePreferencesPatch(update.mock.calls[0][1] as UpdatePreferencesRequest),
    ).toEqual({pwaBannerDismissedAt: null});
  });

  it('rejects a theme outside light, dark and system', async () => {
    const response = await request(app.getHttpServer())
      .patch('/preferences')
      .send({theme: 'blue'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {theme: 'El valor no está permitido.'}},
    });
  });

  it('rejects a malformed PWA banner timestamp', async () => {
    const response = await request(app.getHttpServer())
      .patch('/preferences')
      .send({pwaBannerDismissedAt: 'not-a-date'})
      .expect(400);

    expect(response.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: {fields: {pwaBannerDismissedAt: 'El formato no es válido.'}},
    });
  });

  it('returns 401 when the request has no authenticated principal', async () => {
    authenticated = false;

    await request(app.getHttpServer()).get('/preferences').expect(401);

    expect(find).not.toHaveBeenCalled();
  });

  it('documents both routes and the nested request schema in OpenAPI', () => {
    const document = createOpenApiDocument(app);

    expect(document.paths?.['/preferences']).toEqual(
      expect.objectContaining({get: expect.any(Object), patch: expect.any(Object)}),
    );
    expect(document.components?.schemas?.UpdatePreferencesRequestDto).toMatchObject({
      type: 'object',
      properties: expect.objectContaining({
        theme: expect.any(Object),
        accounts: expect.any(Object),
        movements: expect.any(Object),
      }),
    });
    expect(document.components?.schemas?.PreferencesResponseDto).toMatchObject({
      type: 'object',
      properties: expect.objectContaining({updatedAt: expect.any(Object)}),
    });
  });
});

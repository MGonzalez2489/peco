import express from 'express';
import request from 'supertest';
import {createSecurityHeaders} from './security-headers.middleware';
import {createStrictCors} from './strict-cors.middleware';

describe('HTTP hardening (US-1004)', () => {
  it('sets the baseline security headers and HSTS only in production', async () => {
    const development = express();
    development.use(createSecurityHeaders(false));
    development.get('/', (_request, response) => response.json({ok: true}));

    const developmentResponse = await request(development).get('/');
    expect(developmentResponse.headers['x-content-type-options']).toBe('nosniff');
    expect(developmentResponse.headers['x-frame-options']).toBe('DENY');
    expect(developmentResponse.headers['referrer-policy']).toBe('no-referrer');
    expect(developmentResponse.headers['content-security-policy']).toContain(
      "frame-ancestors 'none'",
    );
    expect(developmentResponse.headers['strict-transport-security']).toBeUndefined();

    const production = express();
    production.use(createSecurityHeaders(true));
    production.get('/', (_request, response) => response.json({ok: true}));
    const productionResponse = await request(production).get('/');
    expect(productionResponse.headers['strict-transport-security']).toContain('max-age=');
  });

  it('reflects only allowlisted origins and never allows credentials', async () => {
    const app = express();
    app.use(createStrictCors(['https://app.example.com']));
    app.get('/', (_request, response) => response.json({ok: true}));

    const allowed = await request(app).get('/').set('Origin', 'https://app.example.com');
    expect(allowed.headers['access-control-allow-origin']).toBe('https://app.example.com');
    expect(allowed.headers['access-control-allow-credentials']).toBeUndefined();

    const denied = await request(app).get('/').set('Origin', 'https://evil.example.com');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await request(app).options('/').set('Origin', 'https://app.example.com');
    expect(preflight.status).toBe(204);
  });
});

import express from 'express';
import request from 'supertest';
import {createMetricsEndpoint} from './metrics-endpoint.middleware';
import {MetricsRegistry} from './metrics-registry';
import {MetricsService} from './metrics.service';

describe('metrics endpoint (US-1002/US-1004)', () => {
  const build = (token?: string, remoteIp?: string): express.Express => {
    const app = express();
    app.use((req, _response, next) => {
      Object.assign(req, {correlationId: '01JC7Z3Q9K'});
      if (remoteIp) {
        Object.defineProperty(req, 'ip', {value: remoteIp});
      }
      next();
    });
    app.use(
      '/metrics',
      createMetricsEndpoint({metrics: new MetricsService(new MetricsRegistry()), token}),
    );
    return app;
  };

  it('serves Prometheus text to a private-network caller', async () => {
    const response = await request(build()).get('/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('# TYPE http_requests_total counter');
  });

  it('allows a public caller with the configured token', async () => {
    const response = await request(build('a-very-private-token', '203.0.113.10'))
      .get('/metrics')
      .set('x-metrics-token', 'a-very-private-token');

    expect(response.status).toBe(200);
  });

  it('rejects a public caller without a valid token', async () => {
    const response = await request(build('a-very-private-token', '203.0.113.10')).get('/metrics');

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });
});

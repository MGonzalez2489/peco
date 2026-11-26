import type {NextFunction, Response} from 'express';
import type {Request} from 'express';
import {METRICS_PATH} from '../constants/metrics-path.constant';
import {MetricsService} from './metrics.service';

type MetricsRequest = Request & {route?: {path?: string}};

/** Records route-level HTTP duration and count without capturing query values or bodies (13.2). */
export const createHttpMetricsMiddleware =
  (metrics: MetricsService) =>
  (request: MetricsRequest, response: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      if (request.path === METRICS_PATH) {
        return;
      }
      const route = request.route?.path ? `${request.baseUrl}${request.route.path}` : 'unmatched';
      metrics.recordHttpRequest(request.method, route, response.statusCode, durationMs(startedAt));
    });

    next();
  };

const durationMs = (startedAt: bigint): number =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

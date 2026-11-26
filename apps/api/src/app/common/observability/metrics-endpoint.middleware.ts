import {ApiErrorCodeEnum} from '@peco/enums';
import {timingSafeEqual} from 'node:crypto';
import type {NextFunction, Request, Response} from 'express';
import {METRICS_TOKEN_HEADER} from '../constants/metrics-token-header.constant';
import {API_ERROR_MESSAGES} from '../http/api-error-messages.constant';
import {renderApiError} from '../http/api-error-renderer';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {MetricsService} from './metrics.service';

export interface MetricsEndpointOptions {
  readonly metrics: MetricsService;
  readonly token?: string;
}

const normalizeAddress = (value: string): string =>
  value.startsWith('::ffff:') ? value.slice(7) : value;

const isPrivateAddress = (address: string | undefined): boolean => {
  if (!address) {
    return false;
  }
  const normalized = normalizeAddress(address);
  if (normalized === '::1' || /^f[cd][0-9a-f]{2}:/i.test(normalized)) {
    return true;
  }

  const parts = normalized.split('.').map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }
  const [first, second] = parts;
  return (
    first === 10 ||
    (first === 127 && second >= 0) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
};

const tokenMatches = (provided: string | undefined, expected: string): boolean => {
  if (!provided) {
    return false;
  }
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
};

/** Exposes Prometheus text only to the private network or a strong shared token (13.2). */
export const createMetricsEndpoint =
  (options: MetricsEndpointOptions) =>
  (request: Request, response: Response, next: NextFunction): void => {
    if (request.method !== 'GET') {
      next();
      return;
    }

    const remoteAddress = request.ip ?? request.socket.remoteAddress;
    const token = request.header(METRICS_TOKEN_HEADER);
    const authorized =
      isPrivateAddress(remoteAddress) ||
      (options.token !== undefined && token !== undefined && tokenMatches(token, options.token));

    if (!authorized) {
      renderApiError(
        response,
        {
          statusCode: 403,
          code: ApiErrorCodeEnum.FORBIDDEN.toString(),
          message: API_ERROR_MESSAGES.FORBIDDEN,
        },
        (request as CorrelatedRequest).correlationId ?? 'unavailable',
      );
      return;
    }

    response.status(200);
    response.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    response.send(options.metrics.render());
  };

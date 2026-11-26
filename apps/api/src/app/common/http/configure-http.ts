import type {INestApplication, LoggerService, NestInterceptor} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {json, type ErrorRequestHandler} from 'express';
import {MAX_JSON_BODY_SIZE} from '../constants/max-json-body-size.constant';
import {METRICS_PATH} from '../constants/metrics-path.constant';
import {createRequestLogger} from '../logging/request-logger.middleware';
import {createHttpMetricsMiddleware} from '../observability/http-metrics.middleware';
import {createMetricsEndpoint} from '../observability/metrics-endpoint.middleware';
import type {MetricsService} from '../observability/metrics.service';
import type {AppConfig} from '../../config/app-config';
import {createSecurityHeaders} from './security-headers.middleware';
import {createStrictCors} from './strict-cors.middleware';
import {correlationIdMiddleware} from '../middleware/correlation-id.middleware';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {createValidationPipe} from '../validation/validation.pipe';
import {API_ERROR_MESSAGES} from './api-error-messages.constant';
import {renderApiError} from './api-error-renderer';
import {AllExceptionsFilter} from './all-exceptions.filter';
import {ResponseEnvelopeInterceptor} from './response-envelope.interceptor';

const bodyLimitErrorHandler: ErrorRequestHandler = (error, request, response, next) => {
  const status =
    typeof error === 'object' && error !== null && 'status' in error ? error.status : undefined;
  const type =
    typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined;

  if (status === 413 || type === 'entity.too.large') {
    renderApiError(
      response,
      {
        statusCode: 413,
        code: ApiErrorCodeEnum.PAYLOAD_TOO_LARGE.toString(),
        message: API_ERROR_MESSAGES.PAYLOAD_TOO_LARGE,
      },
      (request as CorrelatedRequest).correlationId ?? 'unavailable',
    );
    return;
  }

  next(error);
};

/**
 * Applies the cross-cutting HTTP contract once for the whole API: correlation
 * id, bounded JSON bodies, request logging, idempotency, envelopes and global
 * validation. `main.ts` and the HTTP contract tests use this same function.
 *
 * The idempotency interceptor is registered first so it stores the raw handler
 * result; the envelope interceptor then wraps fresh responses exactly once.
 */
export function configureHttp(
  app: INestApplication,
  options: {
    logger: LoggerService;
    idempotency?: NestInterceptor;
    config?: Pick<AppConfig, 'env' | 'corsOrigins' | 'metricsToken'>;
    metrics?: MetricsService;
  },
): void {
  app.use(correlationIdMiddleware);
  if (options.config) {
    app.use(createSecurityHeaders(options.config.env === 'production'));
    app.use(createStrictCors(options.config.corsOrigins));
    if (options.metrics) {
      app.use(
        METRICS_PATH,
        createMetricsEndpoint({metrics: options.metrics, token: options.config.metricsToken}),
      );
    }
  }
  app.use(json({limit: MAX_JSON_BODY_SIZE}));
  app.use(bodyLimitErrorHandler);
  if (options.metrics) {
    app.use(createHttpMetricsMiddleware(options.metrics));
  }
  app.use(createRequestLogger(options.logger));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  if (options.idempotency) {
    app.useGlobalInterceptors(options.idempotency);
  }
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
}

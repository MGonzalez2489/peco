import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type {Response} from 'express';
import {getCorrelationId} from '../middleware/correlation-id.context';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {renderApiError} from './api-error-renderer';
import {isHealthRequest} from './is-health-request';
import {normalizeApiError} from './normalize-api-error.util';

/**
 * Renders every failure as `{data: null, error: {...}}` with a stable code, a
 * Spanish message and the request correlation id (8.3/D65). Unhandled exceptions
 * become `500 INTERNAL_ERROR`; the stack trace and SQL text stay in the server
 * log and are never sent to the client.
 *
 * `/health` is the only exception: it keeps its flat contract (8.3).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<Response>();

    if (isHealthRequest(request)) {
      this.replyToHealth(exception, response);
      return;
    }

    const error = normalizeApiError(exception);
    const correlationId = request.correlationId ?? getCorrelationId() ?? 'unavailable';

    if (error.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${error.statusCode} ${error.code} [${correlationId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    renderApiError(response, error, correlationId);
  }

  /** Health keeps its flat body: `{status, uptime, db}`. */
  private replyToHealth(exception: unknown, response: Response): void {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      response
        .status(exception.getStatus())
        .json(typeof body === 'string' ? {status: 'error', message: body} : body);
      return;
    }

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      status: 'error',
      uptime: process.uptime(),
      db: 'down',
    });
  }
}

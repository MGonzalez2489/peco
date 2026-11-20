import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type {ApiErrorCode} from '@peco/contracts';
import {ApiErrorCodeEnum} from '@peco/enums';
import type {Response} from 'express';
import {getCorrelationId} from '../middleware/correlation-id.context';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {API_ERROR_CODE_BY_STATUS} from './api-error-code-by-status.constant';
import {API_ERROR_MESSAGES} from './api-error-messages.constant';
import {renderApiError, type RenderableApiError} from './api-error-renderer';
import {ApiException} from './api-exception';
import {isHealthRequest} from './is-health-request';

type NormalizedError = RenderableApiError;

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

    const error = this.normalize(exception);
    const correlationId = request.correlationId ?? getCorrelationId() ?? 'unavailable';

    if (error.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.originalUrl} -> ${error.statusCode} ${error.code} [${correlationId}]`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    renderApiError(response, error, correlationId);
  }

  private normalize(exception: unknown): NormalizedError {
    if (exception instanceof ApiException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.userMessage,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const code = API_ERROR_CODE_BY_STATUS[statusCode] ?? this.fallbackCode(statusCode);

      return {statusCode, code, message: API_ERROR_MESSAGES[code]};
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ApiErrorCodeEnum.INTERNAL_ERROR.toString(),
      message: API_ERROR_MESSAGES.INTERNAL_ERROR,
    };
  }

  private fallbackCode(statusCode: number): ApiErrorCode {
    return statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
      ? ApiErrorCodeEnum.INTERNAL_ERROR.toString()
      : ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString();
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

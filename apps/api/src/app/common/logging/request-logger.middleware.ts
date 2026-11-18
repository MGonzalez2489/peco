import type {LoggerService} from '@nestjs/common';
import type {NextFunction, Response} from 'express';
import type {CorrelatedRequest} from '../types/correlated-request.type';

type AuthenticatedRequest = CorrelatedRequest & {
  user?: {publicId?: string; id?: string};
};

/**
 * Emits exactly one request line after the response finishes. It carries only
 * route-level fields: no body, headers, tokens or query values are logged.
 */
export const createRequestLogger =
  (logger: LoggerService) =>
  (request: AuthenticatedRequest, response: Response, next: NextFunction): void => {
    const startedAt = process.hrtime.bigint();

    response.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const userId = request.user?.publicId ?? request.user?.id;
      const route = request.route?.path ? `${request.baseUrl}${request.route.path}` : 'unmatched';

      logger.log(
        {
          event: 'http_request',
          method: request.method,
          route,
          statusCode: response.statusCode,
          durationMs: Math.round(durationMs),
          correlationId: request.correlationId,
          ...(userId ? {userId} : {}),
        },
        'HTTP',
      );
    });

    next();
  };

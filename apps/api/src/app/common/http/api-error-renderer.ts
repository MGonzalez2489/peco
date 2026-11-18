import type {ApiErrorCode} from '@peco/contracts';
import type {Response} from 'express';

/** Error fields shared by the exception filter and low-level middleware. */
export interface RenderableApiError {
  statusCode: number;
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

/** Renders the single error envelope used by every client-facing route (8.3). */
export const renderApiError = (
  response: Response,
  error: RenderableApiError,
  correlationId: string,
): void => {
  response.status(error.statusCode).json({
    error: {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : {details: error.details}),
      correlationId,
    },
  });
};

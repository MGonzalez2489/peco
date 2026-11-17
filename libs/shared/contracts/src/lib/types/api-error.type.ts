import type {ApiErrorCode} from './api-error-code.type';

/**
 * Envelope for every failed client-facing response (8.3/D65).
 * `message` is user-facing Spanish; `code` is the stable English value.
 */
export interface ApiError {
  error: {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    correlationId: string;
  };
}

import type {ApiErrorCode} from './api-error-code.type';

/**
 * Envelope for every failed client-facing response (8.3/D65).
 * `data` is always `null` on error and `error` has the same shape for list and
 * non-list endpoints. `message` is user-facing Spanish; `code` is the stable
 * English value.
 */
export interface ApiError {
  data: null;
  error: {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    correlationId: string;
  };
}

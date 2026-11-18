import type {ApiErrorCode} from '@peco/contracts';

/**
 * Fallback code for framework exceptions that are not an `ApiException`.
 * Domain modules always throw `ApiException` with an explicit code.
 */
export const API_ERROR_CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'VERSION_CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMITED',
};

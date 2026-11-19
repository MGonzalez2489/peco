import type {ApiErrorCode} from '@peco/contracts';
import {ApiErrorCodeEnum} from '@peco/enums';

/**
 * Fallback code for framework exceptions that are not an `ApiException`.
 * Domain modules always throw `ApiException` with an explicit code.
 */
export const API_ERROR_CODE_BY_STATUS: Partial<Record<number, ApiErrorCode>> = {
  400: ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
  401: ApiErrorCodeEnum.UNAUTHORIZED.toString(),
  403: ApiErrorCodeEnum.FORBIDDEN.toString(),
  404: ApiErrorCodeEnum.NOT_FOUND.toString(),
  409: ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
  413: ApiErrorCodeEnum.PAYLOAD_TOO_LARGE.toString(),
  422: ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString(),
  429: ApiErrorCodeEnum.RATE_LIMITED.toString(),
};

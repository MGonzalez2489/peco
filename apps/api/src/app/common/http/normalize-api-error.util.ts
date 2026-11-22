import {HttpException, HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_CODE_BY_STATUS} from './api-error-code-by-status.constant';
import {API_ERROR_MESSAGES} from './api-error-messages.constant';
import type {RenderableApiError} from './api-error-renderer';
import {ApiException} from './api-exception';

/** Single normalization path shared by the exception filter and idempotent replays. */
export const normalizeApiError = (exception: unknown): RenderableApiError => {
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
    const code =
      API_ERROR_CODE_BY_STATUS[statusCode] ??
      (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
        ? ApiErrorCodeEnum.INTERNAL_ERROR.toString()
        : ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString());

    return {statusCode, code, message: API_ERROR_MESSAGES[code]};
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    code: ApiErrorCodeEnum.INTERNAL_ERROR.toString(),
    message: API_ERROR_MESSAGES.INTERNAL_ERROR,
  };
};

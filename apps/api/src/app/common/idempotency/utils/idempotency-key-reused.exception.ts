import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../http/api-error-messages.constant';
import {ApiException} from '../../http/api-exception';

/** Stable `409` raised when a key is replayed with a different request (8.5, D108). */
export const idempotencyKeyReusedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.IDEMPOTENCY_KEY_REUSED.toString(),
    API_ERROR_MESSAGES.IDEMPOTENCY_KEY_REUSED,
  );

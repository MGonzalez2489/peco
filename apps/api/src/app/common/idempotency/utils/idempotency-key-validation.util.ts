import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../http/api-error-messages.constant';
import {ApiException} from '../../http/api-exception';
import {VALIDATION_FIELD_MESSAGES} from '../../validation/validation-field-messages.constant';
import {IDEMPOTENCY_LIMITS} from '../constants/idempotency-limits.constant';

const invalidKey = (message: string): ApiException =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {fields: {idempotencyKey: message}},
  );

/** Validates the 8–128 character header contract and reports it as a field error (8.5). */
export const validateIdempotencyKey = (
  value: string | undefined,
  required: boolean,
): string | null => {
  if (!value) {
    if (required) {
      throw invalidKey(VALIDATION_FIELD_MESSAGES.isDefined);
    }
    return null;
  }

  if (
    value.length < IDEMPOTENCY_LIMITS.minKeyLength ||
    value.length > IDEMPOTENCY_LIMITS.maxKeyLength
  ) {
    throw invalidKey(VALIDATION_FIELD_MESSAGES.minLength);
  }

  return value;
};

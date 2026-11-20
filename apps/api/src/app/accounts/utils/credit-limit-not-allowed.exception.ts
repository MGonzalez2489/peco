import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {VALIDATION_FIELD_MESSAGES} from '../../common/validation/validation-field-messages.constant';

/** Stable 400 when the final account metadata keeps a credit limit on a non-credit type (8.8). */
export const creditLimitNotAllowedException = (): ApiException =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {fields: {creditLimit: VALIDATION_FIELD_MESSAGES.creditLimitOnlyForCredit}},
  );

import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 400 for a cross-field rule that depends on the stored schedule (8.15/US-602). */
export const scheduleValidationException = (field: string, message: string): ApiException =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {fields: {[field]: message}},
  );

import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** A defaulted report window still violated the ordered 24-month cap (8.4/Q8). */
export const reportPeriodRangeException = (): ApiException =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {fields: {to: API_ERROR_MESSAGES.VALIDATION_ERROR}},
  );

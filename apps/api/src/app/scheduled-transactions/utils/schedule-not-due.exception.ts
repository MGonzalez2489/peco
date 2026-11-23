import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when the applied date is still in the future (8.11/10.5). */
export const scheduleNotDueException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString(),
    API_ERROR_MESSAGES.SCHEDULE_NOT_DUE,
  );

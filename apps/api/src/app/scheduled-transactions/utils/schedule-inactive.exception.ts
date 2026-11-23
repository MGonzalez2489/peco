import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when an occurrence is requested from a paused schedule (8.11/10.5). */
export const scheduleInactiveException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString(),
    API_ERROR_MESSAGES.SCHEDULE_INACTIVE,
  );

import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when the current UTC month is already frozen (11.8/US-305). */
export const periodClosedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
    API_ERROR_MESSAGES.PERIOD_CLOSED,
  );

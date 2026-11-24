import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 422 when a period predates registration and every ledger row (8.12). */
export const periodBeforeActivityException = (): ApiException =>
  new ApiException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY.toString(),
    API_ERROR_MESSAGES.PERIOD_BEFORE_ACTIVITY,
  );

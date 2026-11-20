import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when a later account write would leave a non-credit account negative (8.3/8.8/D94). */
export const negativeBalanceConflictException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    API_ERROR_MESSAGES.NEGATIVE_BALANCE_NOT_ALLOWED,
  );

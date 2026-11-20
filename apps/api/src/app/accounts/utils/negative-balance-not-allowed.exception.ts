import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 400 when a non-credit account receives a negative initial balance (US-302). */
export const negativeBalanceNotAllowedException = (): ApiException =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    API_ERROR_MESSAGES.NEGATIVE_BALANCE_NOT_ALLOWED,
  );

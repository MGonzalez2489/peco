import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when the requested period is the current one or lies in the future (8.12). */
export const periodNotClosableException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.PERIOD_NOT_CLOSABLE.toString(),
    API_ERROR_MESSAGES.PERIOD_NOT_CLOSABLE,
  );

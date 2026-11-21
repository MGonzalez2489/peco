import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 for deleting a non-zero account without a destination (8.8/D42). */
export const transferRequiredException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.TRANSFER_REQUIRED.toString(),
    API_ERROR_MESSAGES.TRANSFER_REQUIRED,
  );

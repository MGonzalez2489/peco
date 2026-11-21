import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when the caller tries to delete the root account (8.8/US-305). */
export const rootAccountProtectedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.ROOT_ACCOUNT_PROTECTED.toString(),
    API_ERROR_MESSAGES.ROOT_ACCOUNT_PROTECTED,
  );

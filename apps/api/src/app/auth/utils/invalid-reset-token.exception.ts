import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Invalid, used or expired reset token: the same 400 for every unusable link (8.3). */
export const invalidResetTokenException = (): ApiException =>
  new ApiException(
    HttpStatus.BAD_REQUEST,
    ApiErrorCodeEnum.INVALID_RESET_TOKEN.toString(),
    API_ERROR_MESSAGES.INVALID_RESET_TOKEN,
  );

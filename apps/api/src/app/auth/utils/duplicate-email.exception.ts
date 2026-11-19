import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 error for any email already reserved, including soft-deleted users. */
export const duplicateEmailException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.EMAIL_ALREADY_REGISTERED.toString(),
    API_ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED,
  );

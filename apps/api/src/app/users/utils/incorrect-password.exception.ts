import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** A wrong current password during a change is not a login failure (8.7/D70). */
export const incorrectPasswordException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    ApiErrorCodeEnum.UNAUTHORIZED.toString(),
    API_ERROR_MESSAGES.UNAUTHORIZED,
  );

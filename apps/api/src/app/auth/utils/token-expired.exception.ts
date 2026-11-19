import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Expired access token: the client should refresh before retrying (8.3). */
export const tokenExpiredException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    ApiErrorCodeEnum.TOKEN_EXPIRED.toString(),
    API_ERROR_MESSAGES.TOKEN_EXPIRED,
  );

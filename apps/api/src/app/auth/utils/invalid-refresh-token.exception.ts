import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Unknown or unusable refresh token: no session is identified (8.3). */
export const invalidRefreshTokenException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    ApiErrorCodeEnum.UNAUTHORIZED.toString(),
    API_ERROR_MESSAGES.UNAUTHORIZED,
  );

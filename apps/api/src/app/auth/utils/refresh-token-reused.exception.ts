import {HttpStatus} from '@nestjs/common';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Revoked refresh token replayed: the whole family was revoked (D22). */
export const refreshTokenReusedException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    'REFRESH_TOKEN_REUSED',
    API_ERROR_MESSAGES.REFRESH_TOKEN_REUSED,
  );

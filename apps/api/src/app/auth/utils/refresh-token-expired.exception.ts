import {HttpStatus} from '@nestjs/common';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Refresh token past its 30-minute lifetime (US-203). */
export const refreshTokenExpiredException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    'REFRESH_TOKEN_EXPIRED',
    API_ERROR_MESSAGES.REFRESH_TOKEN_EXPIRED,
  );

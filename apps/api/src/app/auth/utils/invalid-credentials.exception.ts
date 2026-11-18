import {HttpStatus} from '@nestjs/common';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** The single 401 for unknown email, wrong password and soft-deleted users (no enumeration). */
export const invalidCredentialsException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    'INVALID_CREDENTIALS',
    API_ERROR_MESSAGES.INVALID_CREDENTIALS,
  );

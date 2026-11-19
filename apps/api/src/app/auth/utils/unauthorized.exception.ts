import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Missing, malformed or otherwise unverifiable access token (8.3). */
export const unauthorizedException = (): ApiException =>
  new ApiException(
    HttpStatus.UNAUTHORIZED,
    ApiErrorCodeEnum.UNAUTHORIZED.toString(),
    API_ERROR_MESSAGES.UNAUTHORIZED,
  );

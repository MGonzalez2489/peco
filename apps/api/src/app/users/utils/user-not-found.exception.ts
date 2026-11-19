import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 404 for an unknown or already deleted user (8.3/D87). */
export const userNotFoundException = (): ApiException =>
  new ApiException(
    HttpStatus.NOT_FOUND,
    ApiErrorCodeEnum.NOT_FOUND.toString(),
    API_ERROR_MESSAGES.NOT_FOUND,
  );

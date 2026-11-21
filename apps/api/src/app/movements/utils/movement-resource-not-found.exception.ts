import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 404 for an unknown or foreign account/category referenced by a movement (8.3/US-501). */
export const movementResourceNotFoundException = (): ApiException =>
  new ApiException(
    HttpStatus.NOT_FOUND,
    ApiErrorCodeEnum.NOT_FOUND.toString(),
    API_ERROR_MESSAGES.NOT_FOUND,
  );

import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 404 for an unknown, foreign or soft-deleted movement (8.10/US-503). */
export const movementNotFoundException = (): ApiException =>
  new ApiException(
    HttpStatus.NOT_FOUND,
    ApiErrorCodeEnum.MOVEMENT_NOT_FOUND.toString(),
    API_ERROR_MESSAGES.MOVEMENT_NOT_FOUND,
  );

import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 for a reversed, contra or canceled movement (8.10/US-504). */
export const movementLockedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.MOVEMENT_LOCKED.toString(),
    API_ERROR_MESSAGES.MOVEMENT_LOCKED,
  );

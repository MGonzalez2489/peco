import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 for an active category colliding in the owner namespace (8.9/US-402). */
export const categoryNameTakenException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.CATEGORY_NAME_TAKEN.toString(),
    API_ERROR_MESSAGES.CATEGORY_NAME_TAKEN,
  );

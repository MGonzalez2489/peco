import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 422 when a category does not accept the movement type (8.10/US-501). */
export const categoryNotCompatibleException = (): ApiException =>
  new ApiException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    ApiErrorCodeEnum.CATEGORY_NOT_COMPATIBLE.toString(),
    API_ERROR_MESSAGES.CATEGORY_NOT_COMPATIBLE,
  );

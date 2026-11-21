import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when a client tries to modify a global catalog or root category (8.9/US-402). */
export const categorySystemProtectedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.CATEGORY_SYSTEM_PROTECTED.toString(),
    API_ERROR_MESSAGES.CATEGORY_SYSTEM_PROTECTED,
  );

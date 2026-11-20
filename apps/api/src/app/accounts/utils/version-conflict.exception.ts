import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 for an optimistic-locking mismatch (8.3/8.5/US-303). */
export const versionConflictException = (
  expectedVersion: number,
  currentVersion: number,
): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
    API_ERROR_MESSAGES.VERSION_CONFLICT,
    {expectedVersion, currentVersion},
  );

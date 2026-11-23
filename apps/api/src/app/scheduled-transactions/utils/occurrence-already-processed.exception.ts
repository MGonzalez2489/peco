import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 409 when a re-anchored grid point already has an execution row (10.8/US-602). */
export const occurrenceAlreadyProcessedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED.toString(),
    API_ERROR_MESSAGES.OCCURRENCE_ALREADY_PROCESSED,
  );

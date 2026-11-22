import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {VALIDATION_FIELD_MESSAGES} from '../../common/validation/validation-field-messages.constant';

/** Stable 400 for an attempted `date` mutation; the field is server-owned after creation (9.4). */
export const movementDateImmutableException = (): ApiException =>
  new ApiException(
    400,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {fields: {date: VALIDATION_FIELD_MESSAGES.movementDateImmutable}},
  );

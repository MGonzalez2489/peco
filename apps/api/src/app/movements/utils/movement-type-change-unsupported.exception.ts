import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {VALIDATION_FIELD_MESSAGES} from '../../common/validation/validation-field-messages.constant';

/** Temporary 400 until US-505 implements the atomic replace path for `type` changes (D46). */
export const movementTypeChangeUnsupportedException = (): ApiException =>
  new ApiException(
    400,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {fields: {type: VALIDATION_FIELD_MESSAGES.movementTypeChangeUnsupported}},
  );

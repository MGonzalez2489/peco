import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/** Stable 422 for a well-formed but self-referential transfer destination (8.8/D96). */
export const selfTransferException = (): ApiException =>
  new ApiException(
    HttpStatus.UNPROCESSABLE_ENTITY,
    ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString(),
    API_ERROR_MESSAGES.UNPROCESSABLE_ENTITY,
  );

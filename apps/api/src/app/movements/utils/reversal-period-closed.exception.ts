import {HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';

/**
 * Stable 409 for a frozen period with compensating-movement guidance (9.6/8.10/US-507).
 * The code stays `PERIOD_CLOSED`; only the Spanish message is route-specific.
 */
export const reversalPeriodClosedException = (): ApiException =>
  new ApiException(
    HttpStatus.CONFLICT,
    ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
    `${API_ERROR_MESSAGES.PERIOD_CLOSED} Crea un movimiento compensatorio en el período actual en su lugar.`,
  );

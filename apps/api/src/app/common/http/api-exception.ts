import {HttpException} from '@nestjs/common';
import type {ApiErrorCode} from '@peco/contracts';

/**
 * Domain error with a stable English `code` and a user-facing Spanish message.
 * The global exception filter renders it as `{error: {...}}` (8.3/D65).
 */
export class ApiException extends HttpException {
  constructor(
    statusCode: number,
    readonly code: ApiErrorCode,
    readonly userMessage: string,
    readonly details?: unknown,
  ) {
    super({code, message: userMessage, details}, statusCode);
  }
}

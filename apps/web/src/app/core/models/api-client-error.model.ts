import type {ApiErrorCode} from '@peco/contracts';

/** Normalized client-side representation of the API error envelope. */
export class ApiClientError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly correlationId: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

import type {ApiErrorCode} from '@peco/contracts';

/** Discriminated payload persisted in `idempotencyKeys.responseBody` (D108). */
export type StoredIdempotencyBody =
  | {kind: 'success'; data: unknown; meta?: Record<string, unknown>}
  | {
      kind: 'error';
      statusCode: number;
      code: ApiErrorCode;
      message: string;
      details?: unknown;
    };

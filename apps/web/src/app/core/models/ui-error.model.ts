import type {ApiErrorCode} from '@peco/contracts';

/** Presentation-ready API error with Spanish copy for the UI. */
export interface UiError {
  readonly code: ApiErrorCode;
  readonly title: string;
  readonly message: string;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly correlationId: string;
  readonly retryAfterSeconds?: number;
}

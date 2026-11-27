import {Injectable, signal} from '@angular/core';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_UI_COPY} from '../constants/api-error-ui-copy.constant';
import {ApiClientError} from '../models/api-client-error.model';
import {UiError} from '../models/ui-error.model';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

/** Extracts the backend's `details.fields` map without trusting its shape. */
const readFieldErrors = (details: unknown): Record<string, string> => {
  const record = asRecord(details);
  const fields = record && 'fields' in record ? asRecord(record['fields']) : null;
  if (!fields) return {};

  const result: Record<string, string> = {};
  for (const [field, message] of Object.entries(fields)) {
    if (typeof message === 'string') {
      result[field] = message;
    }
  }
  return result;
};

/** Maps transport errors to Spanish UI copy and holds the current global alert. */
@Injectable({providedIn: 'root'})
export class ApiErrorPresenterService {
  readonly error = signal<UiError | null>(null);

  /** Pure mapping, useful for forms that show errors inline. */
  describe(error: unknown): UiError {
    if (!(error instanceof ApiClientError)) {
      return {
        code: ApiErrorCodeEnum.INTERNAL_ERROR.toString(),
        title: API_ERROR_UI_COPY.title,
        message: API_ERROR_UI_COPY.fallbackMessage,
        fieldErrors: {},
        correlationId: 'unavailable',
      };
    }

    return {
      code: error.code,
      title: API_ERROR_UI_COPY.title,
      message: API_ERROR_UI_COPY.messages[error.code] ?? API_ERROR_UI_COPY.fallbackMessage,
      fieldErrors: readFieldErrors(error.details),
      correlationId: error.correlationId || 'unavailable',
      ...(error.retryAfterSeconds !== undefined
        ? {retryAfterSeconds: error.retryAfterSeconds}
        : {}),
    };
  }

  /** Publishes the error so the global alert can announce it. */
  present(error: unknown): void {
    this.error.set(this.describe(error));
  }

  dismiss(): void {
    this.error.set(null);
  }
}

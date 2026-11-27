import {
  HttpErrorResponse,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import type {ApiErrorCode} from '@peco/contracts';
import {ApiErrorCodeEnum} from '@peco/enums';
import {catchError, map, throwError} from 'rxjs';
import {CORRELATION_ID_HEADER} from '../constants/correlation-id-header.constant';
import {RETRY_AFTER_HEADER} from '../constants/retry-after-header.constant';
import {CORRELATION_ID} from './contexts/correlation-id.context';
import {RAW_RESPONSE} from './contexts/raw-response.context';
import {ApiClientError} from '../models/api-client-error.model';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

/** Accepts either the full error envelope or the nested `error` object. */
const readErrorObject = (value: unknown): Record<string, unknown> | null => {
  const record = asRecord(value);
  if (!record) return null;
  return 'error' in record ? asRecord(record['error']) : record;
};

/** Accepts the delta-seconds form used by the API's rate-limit guard. */
const readRetryAfterSeconds = (headers: HttpHeaders): number | undefined => {
  const raw = headers.get(RETRY_AFTER_HEADER);
  if (!raw) return undefined;

  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : undefined;
};

const FALLBACK_CODES: Readonly<Record<number, ApiErrorCode>> = {
  400: ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
  401: ApiErrorCodeEnum.UNAUTHORIZED.toString(),
  403: ApiErrorCodeEnum.FORBIDDEN.toString(),
  404: ApiErrorCodeEnum.NOT_FOUND.toString(),
  429: ApiErrorCodeEnum.RATE_LIMITED.toString(),
};

const toClientError = (
  value: unknown,
  status: number,
  headers: HttpHeaders,
  requestCorrelationId: string,
): ApiClientError => {
  const apiError = readErrorObject(value);
  const correlationId =
    (typeof apiError?.['correlationId'] === 'string' ? apiError['correlationId'] : null) ??
    headers.get(CORRELATION_ID_HEADER) ??
    (requestCorrelationId || 'unavailable');

  return new ApiClientError(
    typeof apiError?.['statusCode'] === 'number' ? apiError['statusCode'] : status,
    typeof apiError?.['code'] === 'string'
      ? (apiError['code'] as ApiErrorCode)
      : (FALLBACK_CODES[status] ?? ApiErrorCodeEnum.INTERNAL_ERROR.toString()),
    typeof apiError?.['message'] === 'string'
      ? apiError['message']
      : 'No se pudo completar la solicitud.',
    correlationId,
    apiError?.['details'],
    readRetryAfterSeconds(headers),
  );
};

const unwrap = (
  event: HttpResponse<unknown>,
  request: HttpRequest<unknown>,
): HttpResponse<unknown> => {
  if (event.status === 204) {
    return event.clone({body: null});
  }

  if (request.context.get(RAW_RESPONSE)) {
    return event;
  }

  const body = asRecord(event.body);
  if (!body || !('data' in body) || !('error' in body)) {
    return event;
  }

  if (body['error'] !== null && body['error'] !== undefined) {
    throw toClientError(
      body['error'],
      event.status,
      event.headers,
      request.context.get(CORRELATION_ID),
    );
  }

  const meta = 'meta' in body ? body['meta'] : undefined;
  return event.clone({body: meta !== undefined ? {data: body['data'], meta} : body['data']});
};

/** Strips the API envelope exactly once and normalizes every failure. */
export const envelopeInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    map((event) => (event instanceof HttpResponse ? unwrap(event, request) : event)),
    catchError((error: unknown) =>
      throwError(() =>
        error instanceof HttpErrorResponse
          ? toClientError(
              error.error,
              error.status,
              error.headers,
              request.context.get(CORRELATION_ID),
            )
          : error,
      ),
    ),
  );

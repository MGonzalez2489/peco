import {HttpInterceptorFn} from '@angular/common/http';
import {IDEMPOTENCY_KEY_HEADER} from '../constants/idempotency-key-header.constant';
import {createUuid} from '../utils/create-uuid.util';
import {IDEMPOTENT} from './contexts/idempotent.context';
import {IDEMPOTENCY_KEY} from './contexts/idempotency-key.context';

/** Adds a fresh key only to mutations marked as requiring idempotency. */
export const idempotencyInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.context.get(IDEMPOTENT) || request.headers.has(IDEMPOTENCY_KEY_HEADER)) {
    return next(request);
  }

  const key = request.context.get(IDEMPOTENCY_KEY) || createUuid();

  return next(
    request.clone({
      setHeaders: {[IDEMPOTENCY_KEY_HEADER]: key},
      context: request.context.set(IDEMPOTENCY_KEY, key),
    }),
  );
};

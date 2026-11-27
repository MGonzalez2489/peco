import {HttpInterceptorFn} from '@angular/common/http';
import {CORRELATION_ID_HEADER} from '../constants/correlation-id-header.constant';
import {createUuid} from '../utils/create-uuid.util';
import {CORRELATION_ID} from './contexts/correlation-id.context';

/** Propagates one correlation id per request and shares it with error reporting. */
export const correlationInterceptor: HttpInterceptorFn = (request, next) => {
  const correlationId = request.context.get(CORRELATION_ID) || createUuid();

  return next(
    request.clone({
      setHeaders: {[CORRELATION_ID_HEADER]: correlationId},
      context: request.context.set(CORRELATION_ID, correlationId),
    }),
  );
};

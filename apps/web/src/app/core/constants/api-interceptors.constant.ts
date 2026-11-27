import {HttpInterceptorFn} from '@angular/common/http';
import {authInterceptor} from '../api/auth.interceptor';
import {correlationInterceptor} from '../api/correlation.interceptor';
import {envelopeInterceptor} from '../api/envelope.interceptor';
import {idempotencyInterceptor} from '../api/idempotency.interceptor';

/** Ordered HTTP chain: auth wraps the rest so it sees raw 401 responses first. */
export const API_INTERCEPTORS: HttpInterceptorFn[] = [
  authInterceptor,
  correlationInterceptor,
  idempotencyInterceptor,
  envelopeInterceptor,
];

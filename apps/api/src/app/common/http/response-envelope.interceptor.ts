import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {EnvelopeResult} from './envelope-result';
import {isHealthRequest} from './is-health-request';

/**
 * Wraps every client-facing success in `{data, meta}` (8.3/D65).
 *
 * Exceptions: `/health` keeps its flat contract and `204` responses stay
 * bodyless (their handler returns `undefined`). Controllers that need
 * pagination or totals return an `EnvelopeResult`; everything else is wrapped
 * as `{data: payload}`.
 */
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<CorrelatedRequest>();

    if (isHealthRequest(request)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((body: unknown) => {
        if (body === undefined) {
          return body;
        }

        const meta = {correlationId: request.correlationId};

        return body instanceof EnvelopeResult
          ? {data: body.data, meta: {...meta, ...body.meta}}
          : {data: body, meta};
      }),
    );
  }
}

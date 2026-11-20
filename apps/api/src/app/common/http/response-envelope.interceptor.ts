import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {EnvelopeResult} from './envelope-result';
import {EnvelopeStream} from './envelope-stream';
import {isHealthRequest} from './is-health-request';

/**
 * Wraps every client-facing success in the 8.3/D65 envelope.
 *
 * Exceptions: `/health` keeps its flat contract and `204` responses stay
 * bodyless (their handler returns `undefined`). Controllers that need
 * transport metadata (pagination, totals, summary) return an `EnvelopeResult`
 * and receive a list success envelope `{data, meta, error: null}`. Everything
 * else is wrapped as a single-resource success `{data, error: null}`. An
 * `EnvelopeStream` already emits the envelope itself while keeping it on the
 * wire (D73), so it is passed through unchanged.
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
        if (body === undefined || body instanceof EnvelopeStream) {
          return body;
        }

        const meta = {correlationId: request.correlationId};

        return body instanceof EnvelopeResult
          ? {data: body.data, meta: {...meta, ...body.meta}, error: null}
          : {data: body, error: null};
      }),
    );
  }
}

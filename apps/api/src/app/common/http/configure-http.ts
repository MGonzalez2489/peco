import type {INestApplication} from '@nestjs/common';
import {AllExceptionsFilter} from './all-exceptions.filter';
import {ResponseEnvelopeInterceptor} from './response-envelope.interceptor';
import {correlationIdMiddleware} from '../middleware/correlation-id.middleware';
import {createValidationPipe} from '../validation/validation.pipe';

/**
 * Applies the cross-cutting HTTP contract once for the whole API (US-104):
 * correlation id, `{data, meta}` / `{error}` envelopes and global validation.
 * `main.ts` and the HTTP contract tests use this same function.
 */
export function configureHttp(app: INestApplication): void {
  app.use(correlationIdMiddleware);
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
}

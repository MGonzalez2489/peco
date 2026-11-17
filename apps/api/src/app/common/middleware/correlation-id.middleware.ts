import {randomUUID} from 'node:crypto';
import type {NextFunction, Response} from 'express';
import {CORRELATION_ID_HEADER} from '../constants/correlation-id-header.constant';
import type {CorrelatedRequest} from '../types/correlated-request.type';
import {runWithCorrelationId} from './correlation-id.context';

/** Accepts ULID/UUID-like values; anything else is replaced by a generated id. */
const VALID_CORRELATION_ID = /^[A-Za-z0-9._:-]{8,128}$/;

/**
 * Generates (or reuses) the correlation id of the request and exposes it in
 * the response header, on the request and in the async context used by logs.
 */
export function correlationIdMiddleware(
  request: CorrelatedRequest,
  response: Response,
  next: NextFunction,
): void {
  const inbound = request.header(CORRELATION_ID_HEADER);
  const correlationId = inbound && VALID_CORRELATION_ID.test(inbound) ? inbound : randomUUID();

  request.correlationId = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);

  runWithCorrelationId(correlationId, next);
}

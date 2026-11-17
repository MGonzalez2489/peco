import type {Request} from 'express';

/** Express request enriched by the correlation-id middleware. */
export type CorrelatedRequest = Request & {correlationId: string};

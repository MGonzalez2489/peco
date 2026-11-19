import type {CorrelatedRequest} from './correlated-request.type';

/** Express request enriched by the access guard with the JWT subject (D86). */
export type AuthenticatedRequest = CorrelatedRequest & {
  auth?: {publicId: string};
};

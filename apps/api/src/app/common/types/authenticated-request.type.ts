import type {CorrelatedRequest} from './correlated-request.type';

/** Express request enriched by the access guard with the JWT subject and pre-touch activity (D86/D58). */
export type AuthenticatedRequest = CorrelatedRequest & {
  auth?: {publicId: string; previousLastActiveAt?: string | null};
};

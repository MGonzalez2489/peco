import {createHash} from 'node:crypto';
import {canonicalJson} from './canonical-json.util';

interface IdempotencyFingerprint {
  method: string;
  endpoint: string;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  body: unknown;
}

/**
 * SHA-256 of the method, endpoint, route params, query and raw request body.
 * A key reused for any of them is a conflict rather than a replay (8.5, D108).
 */
export const hashIdempotencyRequest = (fingerprint: IdempotencyFingerprint): string =>
  createHash('sha256')
    .update(
      canonicalJson([
        fingerprint.method.toUpperCase(),
        fingerprint.endpoint,
        fingerprint.params ?? {},
        fingerprint.query ?? {},
        fingerprint.body ?? null,
      ]),
    )
    .digest('hex');

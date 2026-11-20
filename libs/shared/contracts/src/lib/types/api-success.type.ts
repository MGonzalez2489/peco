/**
 * Envelope for a successful non-list (single resource/object/value) response (8.3/D65).
 * `error` is always `null` on success. `meta` is not included for non-list responses.
 */
export interface ApiSingleSuccess<T> {
  data: T;
  error: null;
}

/**
 * Envelope for a successful list/collection response (8.3/D65).
 * `meta` carries transport-level information only: `correlationId` plus the
 * optional keys documented per endpoint (`nextCursor`, `totals`, `summary`,
 * `count`). Domain data always lives in `data`.
 */
export interface ApiListSuccess<T, M extends object = object> {
  data: T[];
  meta: {correlationId: string} & M;
  error: null;
}

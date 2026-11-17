/**
 * Envelope for every successful client-facing response (D65).
 *
 * `meta` carries transport-level information only: `correlationId` plus the
 * optional keys documented per endpoint (`nextCursor`, `totals`, `summary`,
 * `count`). Domain data always lives in `data`.
 */
export interface ApiSuccess<T, M extends object = object> {
  data: T;
  meta: {correlationId: string} & M;
}

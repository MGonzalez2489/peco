/** Result of an idempotent execution: fresh success, stored replay or rethrown failure. */
export type IdempotencyOutcome<T> =
  | {kind: 'success'; value: T}
  | {kind: 'replay'; statusCode: number; body: Record<string, unknown>}
  | {kind: 'failure'; exception: unknown};

import {AsyncLocalStorage} from 'node:async_hooks';

const storage = new AsyncLocalStorage<string>();

/** Runs the rest of the request inside the correlation-id context. */
export function runWithCorrelationId<T>(correlationId: string, callback: () => T): T {
  return storage.run(correlationId, callback);
}

/** Correlation id of the request being handled, if any (used by logging). */
export function getCorrelationId(): string | undefined {
  return storage.getStore();
}

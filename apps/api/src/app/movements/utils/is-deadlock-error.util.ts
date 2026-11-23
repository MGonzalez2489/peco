/** Recognizes the retryable MySQL/InnoDB lock failures of ledger writes (D49/9.10). */
export const isDeadlockError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {code?: unknown; errno?: unknown};
  return (
    candidate.code === 'ER_LOCK_DEADLOCK' ||
    candidate.code === 'ER_LOCK_WAIT_TIMEOUT' ||
    candidate.code === '40001' ||
    candidate.errno === 1213 ||
    candidate.errno === 1205
  );
};

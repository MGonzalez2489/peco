/** Recognizes the MySQL/InnoDB deadlock codes retried by ledger writes (D49). */
export const isDeadlockError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {code?: unknown; errno?: unknown};
  return (
    candidate.code === 'ER_LOCK_DEADLOCK' ||
    candidate.code === '40001' ||
    candidate.errno === 1213
  );
};

/** MySQL unique-key violation on `users.email` (Q14/D31). */
export const isDuplicateEmailError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {code?: unknown; errno?: unknown};

  return candidate.code === 'ER_DUP_ENTRY' || candidate.errno === 1062;
};

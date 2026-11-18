/** Normalizes an email once so uniqueness and storage always use the same key (Q14). */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

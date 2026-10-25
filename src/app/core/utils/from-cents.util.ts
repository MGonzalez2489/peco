/**
 * Converts an integer cents amount back to the decimal representation used by
 * money inputs and form controls (`15050` -> `150.5`).
 */
export const fromCents = (cents: number): number => {
  if (!Number.isFinite(cents)) return 0;

  return cents / 100;
};

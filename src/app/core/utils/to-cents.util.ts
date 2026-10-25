/**
 * Converts a decimal monetary amount to its integer cents representation.
 *
 * `Math.round` absorbs the binary floating-point representation error, so
 * `toCents(19.99)` is exactly `1999` and `toCents(0.1 + 0.2)` is `30`.
 */
export const toCents = (amount: number): number => {
  if (!Number.isFinite(amount)) return 0;

  return Math.round(amount * 100);
};

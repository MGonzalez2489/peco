/**
 * Formats a decimal amount (already converted from cents) as US dollars.
 *
 * Prefer `formatCentsToCurrency` for values coming from models or stores, which
 * always hold integer cents.
 */
export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value);

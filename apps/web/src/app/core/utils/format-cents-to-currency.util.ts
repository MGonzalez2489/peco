import {formatCurrency} from './format-currency.util';
import {fromCents} from './from-cents.util';

/**
 * Formats an integer cents amount as a localized currency string, e.g.
 * `15050` -> `"$150.50"`.
 */
export const formatCentsToCurrency = (cents: number): string => formatCurrency(fromCents(cents));

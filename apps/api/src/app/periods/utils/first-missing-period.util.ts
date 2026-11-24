import {periodsFrom} from './periods-from.util';

/** Earliest period in an inclusive range without a stored snapshot (11.5). */
export const firstMissingPeriod = (
  from: string,
  to: string,
  closedPeriods: readonly string[],
): string | null => {
  const closed = new Set(closedPeriods);
  for (const period of periodsFrom(from, to)) {
    if (!closed.has(period)) {
      return period;
    }
  }

  return null;
};

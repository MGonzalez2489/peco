import {nextPeriod} from './next-period.util';

/** Inclusive oldest-first list of calendar months between two valid periods. */
export const periodsFrom = (from: string, to: string): string[] => {
  const periods: string[] = [];
  let current = from;

  while (current <= to) {
    periods.push(current);
    current = nextPeriod(current);
  }

  return periods;
};

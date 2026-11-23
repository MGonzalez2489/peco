import {formatDateOnly} from './format-date-only.util';
import {parseDateOnly} from './parse-date-only.util';

/** Adds whole days in UTC, never through local-time `Date` setters. */
export const addDaysToDate = (value: string, days: number): string => {
  const {year, month, day} = parseDateOnly(value);
  const target = new Date(Date.UTC(year, month - 1, day + days));

  return formatDateOnly(target);
};

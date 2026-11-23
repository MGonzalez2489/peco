import {formatDateOnly} from './format-date-only.util';
import {parseDateOnly} from './parse-date-only.util';

/** Adds whole months in UTC, clamping the day to the target month's length. */
export const addClampedMonthsToDate = (value: string, months: number): string => {
  const {year, month, day} = parseDateOnly(value);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDate = new Date(Date.UTC(targetYear, targetMonth - 1, Math.min(day, lastDay)));

  return formatDateOnly(targetDate);
};

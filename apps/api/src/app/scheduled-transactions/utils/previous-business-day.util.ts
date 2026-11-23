import {formatDateOnly} from './format-date-only.util';
import {parseDateOnly} from './parse-date-only.util';

/** Moves a weekend date back to Friday; weekdays are returned unchanged. */
export const previousBusinessDay = (value: string): string => {
  const {year, month, day} = parseDateOnly(value);
  const date = new Date(Date.UTC(year, month - 1, day));

  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() - 1);
  }

  return formatDateOnly(date);
};

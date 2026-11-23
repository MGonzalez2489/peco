import {parseDateOnly} from './parse-date-only.util';

/** True when the date is the last day of its own month, including leap years. */
export const isLastDayOfMonth = (value: string): boolean => {
  const {year, month, day} = parseDateOnly(value);

  return day === new Date(Date.UTC(year, month, 0)).getUTCDate();
};

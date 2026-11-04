import {toLocalIsoDay} from './to-local-iso-day.util';

/** Returns the `YYYY-MM` period of a date or ISO timestamp, or `''` when invalid. */
export const toPeriod = (value: string | Date): string => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '';
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
  }

  const day = toLocalIsoDay(value);
  return /^\d{4}-\d{2}/.test(day) ? day.slice(0, 7) : '';
};

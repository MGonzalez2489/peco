import {RecurrenceFrequency} from '../types/recurrence-frequency.type';
import {toIsoDate} from './to-iso-date.util';

const parseIsoDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const shiftMonths = (date: Date, months: number): Date => {
  const targetMonth = date.getMonth() + months;
  const lastDayOfTargetMonth = new Date(date.getFullYear(), targetMonth + 1, 0).getDate();

  return new Date(date.getFullYear(), targetMonth, Math.min(date.getDate(), lastDayOfTargetMonth));
};

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const defaultStopDate = (
  nextExecutionDate: string,
  frequency: RecurrenceFrequency,
  interval: number = 1,
): string => {
  const current = parseIsoDate(nextExecutionDate);
  const step = Math.max(1, Math.floor(interval || 1));

  switch (frequency) {
    case 'DAILY':
      return toIsoDate(addDays(current, step));
    case 'WEEKLY':
      return toIsoDate(addDays(current, 7 * step + 1));
    case 'FORTNIGHTLY':
      return toIsoDate(addDays(current, 14 * step + 1));
    case 'MONTHLY':
      return toIsoDate(addDays(shiftMonths(current, step), 1));
    case 'YEARLY':
      return toIsoDate(addDays(shiftMonths(current, 12 * step), 1));
    default:
      return toIsoDate(addDays(shiftMonths(current, step), 1));
  }
};

import {RecurrenceFrequency} from '../types/recurrence-frequency.type';
import {toIsoDate} from './to-iso-date.util';
import {RecurrenceFrequencyEnum} from '@peco/enums';

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
  interval = 1,
): string => {
  const current = parseIsoDate(nextExecutionDate);
  const step = Math.max(1, Math.floor(interval || 1));

  switch (frequency) {
    case RecurrenceFrequencyEnum.DAILY.toString():
      return toIsoDate(addDays(current, step));
    case RecurrenceFrequencyEnum.WEEKLY.toString():
      return toIsoDate(addDays(current, 7 * step + 1));
    case RecurrenceFrequencyEnum.FORTNIGHTLY.toString():
      return toIsoDate(addDays(current, 14 * step + 1));
    case RecurrenceFrequencyEnum.MONTHLY.toString():
      return toIsoDate(addDays(shiftMonths(current, step), 1));
    case RecurrenceFrequencyEnum.YEARLY.toString():
      return toIsoDate(addDays(shiftMonths(current, 12 * step), 1));
    default:
      return toIsoDate(addDays(shiftMonths(current, step), 1));
  }
};

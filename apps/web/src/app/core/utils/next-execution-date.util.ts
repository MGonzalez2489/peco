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

export const nextExecutionDate = (
  isoDate: string,
  frequency: RecurrenceFrequency,
  interval = 1,
): string => {
  const current = parseIsoDate(isoDate);
  const step = Math.max(1, Math.floor(interval || 1));

  switch (frequency) {
    case RecurrenceFrequencyEnum.DAILY.toString(): {
      const next = new Date(current);
      next.setDate(next.getDate() + step);
      return toIsoDate(next);
    }
    case RecurrenceFrequencyEnum.WEEKLY.toString(): {
      const next = new Date(current);
      next.setDate(next.getDate() + 7 * step);
      return toIsoDate(next);
    }
    case RecurrenceFrequencyEnum.FORTNIGHTLY.toString(): {
      const next = new Date(current);
      next.setDate(next.getDate() + 14 * step);
      return toIsoDate(next);
    }
    case RecurrenceFrequencyEnum.MONTHLY.toString():
      return toIsoDate(shiftMonths(current, step));
    case RecurrenceFrequencyEnum.YEARLY.toString():
      return toIsoDate(shiftMonths(current, 12 * step));
    default:
      return toIsoDate(shiftMonths(current, step));
  }
};

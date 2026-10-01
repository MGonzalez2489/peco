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

export const nextExecutionDate = (isoDate: string, frequency: RecurrenceFrequency): string => {
  const current = parseIsoDate(isoDate);

  switch (frequency) {
    case 'DAILY': {
      const next = new Date(current);
      next.setDate(next.getDate() + 1);
      return toIsoDate(next);
    }
    case 'WEEKLY': {
      const next = new Date(current);
      next.setDate(next.getDate() + 7);
      return toIsoDate(next);
    }
    case 'FORTNIGHTLY': {
      const next = new Date(current);
      next.setDate(next.getDate() + 14);
      return toIsoDate(next);
    }
    case 'MONTHLY':
      return toIsoDate(shiftMonths(current, 1));
    case 'YEARLY':
      return toIsoDate(shiftMonths(current, 12));
  }
};

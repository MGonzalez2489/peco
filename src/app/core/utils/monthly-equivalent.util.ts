import {RecurrenceFrequency} from '../types/recurrence-frequency.type';

const MONTHLY_OCCURRENCES: Record<RecurrenceFrequency, number> = {
  DAILY: 30,
  WEEKLY: 4,
  FORTNIGHTLY: 2,
  MONTHLY: 1,
  YEARLY: 1 / 12,
};

export const monthlyEquivalent = (amount: number, frequency: RecurrenceFrequency, interval: number = 1): number => {
  const step = Math.max(1, Math.floor(interval || 1));
  const base = amount * MONTHLY_OCCURRENCES[frequency];
  if (frequency === 'MONTHLY') return amount * (1 / step);
  if (frequency === 'YEARLY') return amount * (1 / (12 * step));
  if (frequency === 'WEEKLY') return amount * (4 / step);
  if (frequency === 'FORTNIGHTLY') return amount * (2 / step);
  if (frequency === 'DAILY') return amount * (30 / step);
  return base;
};

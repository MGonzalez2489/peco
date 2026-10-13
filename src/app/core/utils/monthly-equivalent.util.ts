import {RecurrenceFrequency} from '../types/recurrence-frequency.type';

const MONTHLY_OCCURRENCES: Record<RecurrenceFrequency, number> = {
  DAILY: 30,
  WEEKLY: 4,
  FORTNIGHTLY: 2,
  MONTHLY: 1,
  YEARLY: 1 / 12,
};

export const monthlyEquivalent = (
  amount: number,
  frequency: RecurrenceFrequency,
  interval: number = 1,
): number => {
  const occurrences = MONTHLY_OCCURRENCES[frequency];
  if (occurrences === undefined) return 0;

  const step = Math.max(1, Math.floor(interval || 1));

  return (amount * occurrences) / step;
};

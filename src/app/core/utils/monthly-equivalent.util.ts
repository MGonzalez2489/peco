import {RecurrenceFrequency} from '../types/recurrence-frequency.type';

const MONTHLY_OCCURRENCES: Record<RecurrenceFrequency, number> = {
  DAILY: 30,
  WEEKLY: 4,
  FORTNIGHTLY: 2,
  MONTHLY: 1,
  YEARLY: 1 / 12,
};

export const monthlyEquivalent = (amount: number, frequency: RecurrenceFrequency): number =>
  amount * MONTHLY_OCCURRENCES[frequency];

import {RECURRENCE_FREQUENCY_LABEL} from '../constants/recurrence-frequency-label.constant';
import {RecurrenceFrequency} from '../types/recurrence-frequency.type';

const FREQUENCY_UNIT: Record<RecurrenceFrequency, string> = {
  DAILY: 'días',
  WEEKLY: 'semanas',
  FORTNIGHTLY: 'quincenas',
  MONTHLY: 'meses',
  YEARLY: 'años',
};

export const recurrenceLabel = (frequency: RecurrenceFrequency, interval: number = 1): string => {
  const base = RECURRENCE_FREQUENCY_LABEL[frequency];
  if (!base) return 'Sin frecuencia';

  const step = Math.max(1, Math.floor(interval || 1));
  if (step <= 1) return base;

  return `Cada ${step} ${FREQUENCY_UNIT[frequency]}`;
};

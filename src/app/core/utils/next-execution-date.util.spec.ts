import {RecurrenceFrequency} from '../types/recurrence-frequency.type';
import {nextExecutionDate} from './next-execution-date.util';

describe('nextExecutionDate', () => {
  it('advances a single unit when the interval is 1', () => {
    expect(nextExecutionDate('2026-01-15', 'MONTHLY')).toBe('2026-02-15');
    expect(nextExecutionDate('2026-01-01', 'DAILY')).toBe('2026-01-02');
    expect(nextExecutionDate('2026-01-01', 'WEEKLY')).toBe('2026-01-08');
    expect(nextExecutionDate('2026-01-01', 'FORTNIGHTLY')).toBe('2026-01-15');
    expect(nextExecutionDate('2026-01-01', 'YEARLY')).toBe('2027-01-01');
  });

  it('multiplies the skip by the interval', () => {
    expect(nextExecutionDate('2026-01-15', 'MONTHLY', 2)).toBe('2026-03-15');
    expect(nextExecutionDate('2026-01-15', 'YEARLY', 2)).toBe('2028-01-15');
    expect(nextExecutionDate('2026-01-01', 'DAILY', 2)).toBe('2026-01-03');
  });

  it('clamps the day when the target month is shorter', () => {
    expect(nextExecutionDate('2025-01-31', 'MONTHLY')).toBe('2025-02-28');
    expect(nextExecutionDate('2024-01-31', 'MONTHLY')).toBe('2024-02-29');
    expect(nextExecutionDate('2025-03-31', 'MONTHLY', 3)).toBe('2025-06-30');
  });

  it('clamps invalid intervals to one', () => {
    expect(nextExecutionDate('2026-01-01', 'MONTHLY', 0)).toBe('2026-02-01');
    expect(nextExecutionDate('2026-01-01', 'MONTHLY', -5)).toBe('2026-02-01');
  });

  it('never returns undefined for an unknown frequency', () => {
    const result = nextExecutionDate('2026-01-31', 'BIWEEKLY' as unknown as RecurrenceFrequency);
    expect(result).toBe('2026-02-28');
  });
});

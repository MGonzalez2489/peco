import {defaultStopDate} from './default-stop-date.util';

describe('defaultStopDate', () => {
  it('adds a single period plus one day for weekly, fortnightly, monthly and yearly', () => {
    expect(defaultStopDate('2026-01-15', 'WEEKLY')).toBe('2026-01-23');
    expect(defaultStopDate('2026-01-15', 'FORTNIGHTLY')).toBe('2026-01-30');
    expect(defaultStopDate('2026-01-15', 'MONTHLY')).toBe('2026-02-16');
    expect(defaultStopDate('2026-01-15', 'YEARLY')).toBe('2027-01-16');
  });

  it('adds exactly the interval in days for daily occurrences', () => {
    expect(defaultStopDate('2026-01-15', 'DAILY')).toBe('2026-01-16');
    expect(defaultStopDate('2026-01-15', 'DAILY', 2)).toBe('2026-01-17');
  });

  it('multiplies the period by the interval', () => {
    expect(defaultStopDate('2026-01-15', 'MONTHLY', 2)).toBe('2026-03-16');
    expect(defaultStopDate('2026-01-15', 'YEARLY', 2)).toBe('2028-01-16');
    expect(defaultStopDate('2026-01-15', 'WEEKLY', 2)).toBe('2026-01-30');
  });

  it('clamps the day on shorter target months before adding the extra day', () => {
    expect(defaultStopDate('2025-01-31', 'MONTHLY')).toBe('2025-03-01');
    expect(defaultStopDate('2024-01-31', 'MONTHLY')).toBe('2024-03-01');
  });

  it('clamps invalid intervals to one', () => {
    expect(defaultStopDate('2026-01-15', 'MONTHLY', 0)).toBe('2026-02-16');
    expect(defaultStopDate('2026-01-15', 'MONTHLY', -2)).toBe('2026-02-16');
  });

  it('falls back to a monthly advance for unknown frequencies', () => {
    const unknown = 'BIWEEKLY' as never;
    expect(defaultStopDate('2026-01-15', unknown)).toBe('2026-02-16');
  });
});

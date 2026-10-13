import {RecurrenceFrequency} from '../types/recurrence-frequency.type';
import {monthlyEquivalent} from './monthly-equivalent.util';

describe('monthlyEquivalent', () => {
  it('returns the base monthly equivalent when the interval is 1', () => {
    expect(monthlyEquivalent(1200, 'MONTHLY')).toBe(1200);
    expect(monthlyEquivalent(1200, 'WEEKLY')).toBe(4800);
    expect(monthlyEquivalent(1200, 'FORTNIGHTLY')).toBe(2400);
    expect(monthlyEquivalent(1200, 'DAILY')).toBe(36000);
    expect(monthlyEquivalent(1200, 'YEARLY')).toBe(100);
  });

  it('divides the equivalent when the interval is greater than one', () => {
    expect(monthlyEquivalent(200, 'MONTHLY', 2)).toBe(100);
    expect(monthlyEquivalent(2400, 'YEARLY', 2)).toBe(100);
    expect(monthlyEquivalent(800, 'WEEKLY', 2)).toBe(1600);
    expect(monthlyEquivalent(500, 'FORTNIGHTLY', 2)).toBe(500);
  });

  it('clamps invalid intervals to one', () => {
    expect(monthlyEquivalent(100, 'MONTHLY', 0)).toBe(100);
    expect(monthlyEquivalent(100, 'MONTHLY', -3)).toBe(100);
    expect(monthlyEquivalent(100, 'MONTHLY', 1.9)).toBe(100);
  });

  it('returns zero for an unknown frequency instead of NaN', () => {
    const unknown = 'BIWEEKLY' as unknown as RecurrenceFrequency;
    expect(monthlyEquivalent(100, unknown)).toBe(0);
    expect(Number.isNaN(monthlyEquivalent(100, unknown))).toBe(false);
  });
});

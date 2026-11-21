import {addMonthsToDate} from './add-months-to-date.util';
import {periodUtcBounds} from './period-utc-bounds.util';

describe('movement date bounds (8.4/US-502)', () => {
  it('covers a whole UTC month including a year boundary', () => {
    expect(periodUtcBounds('2026-12')).toEqual({
      from: '2026-12-01T00:00:00.000Z',
      to: '2026-12-31T23:59:59.999Z',
    });
  });

  it('handles leap years', () => {
    expect(periodUtcBounds('2028-02').to).toBe('2028-02-29T23:59:59.999Z');
  });

  it('adds whole months and clamps to shorter target months', () => {
    expect(addMonthsToDate('2026-01-31', 24)).toBe('2028-01-31');
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
  });
});

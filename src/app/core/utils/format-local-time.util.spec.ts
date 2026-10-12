import {formatLocalTime} from './format-local-time.util';

describe('formatLocalTime', () => {
  it('renders a UTC timestamp in the local timezone', () => {
    const local = new Date(2026, 9, 11, 8, 1);
    expect(formatLocalTime(local.toISOString())).toBe('08:01 AM');
  });

  it('renders afternoon hours with the PM suffix', () => {
    const local = new Date(2026, 9, 11, 20, 5);
    expect(formatLocalTime(local.toISOString())).toBe('08:05 PM');
  });

  it('maps midnight to 12 AM and noon to 12 PM', () => {
    expect(formatLocalTime(new Date(2026, 9, 11, 0, 0).toISOString())).toBe('12:00 AM');
    expect(formatLocalTime(new Date(2026, 9, 11, 12, 0).toISOString())).toBe('12:00 PM');
  });

  it('returns an empty string for date-only values and invalid input', () => {
    expect(formatLocalTime('2026-10-11')).toBe('');
    expect(formatLocalTime('not-a-date')).toBe('');
  });
});

import {formatLocalDate} from './format-local-date.util';

describe('formatLocalDate', () => {
  it('renders a UTC timestamp on its local calendar day', () => {
    const local = new Date(2026, 9, 11, 23, 30);
    expect(formatLocalDate(local.toISOString())).toBe('11/10/2026');
  });

  it('keeps date-only values unchanged regardless of timezone', () => {
    expect(formatLocalDate('2026-10-11')).toBe('11/10/2026');
  });
});

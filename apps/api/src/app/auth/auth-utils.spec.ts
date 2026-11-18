import {durationToSeconds} from './utils/duration-to-seconds.util';
import {isDuplicateEmailError} from './utils/is-duplicate-email-error.util';
import {normalizeEmail} from './utils/normalize-email.util';

describe('auth utilities', () => {
  it('normalizes emails with trim and lowercase', () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('converts every supported duration to seconds', () => {
    expect(durationToSeconds('15s')).toBe(15);
    expect(durationToSeconds('15m')).toBe(900);
    expect(durationToSeconds('2h')).toBe(7200);
    expect(durationToSeconds('1d')).toBe(86400);
  });

  it('rejects malformed durations', () => {
    expect(() => durationToSeconds('15 minutes')).toThrow('Invalid duration');
    expect(() => durationToSeconds('0m')).toThrow('Invalid duration');
  });

  it('recognizes the MySQL duplicate-key error', () => {
    expect(isDuplicateEmailError({code: 'ER_DUP_ENTRY'})).toBe(true);
    expect(isDuplicateEmailError({errno: 1062})).toBe(true);
    expect(isDuplicateEmailError(new Error('other'))).toBe(false);
    expect(isDuplicateEmailError(null)).toBe(false);
  });
});

import {nextPeriod} from './next-period.util';
import {periodsFrom} from './periods-from.util';
import {previousPeriod} from './previous-period.util';

describe('calendar period utilities (11.2)', () => {
  it('walks across a year boundary in both directions', () => {
    expect(nextPeriod('2026-12')).toBe('2027-01');
    expect(previousPeriod('2026-01')).toBe('2025-12');
  });

  it('returns an inclusive oldest-first range', () => {
    expect(periodsFrom('2026-10', '2026-12')).toEqual(['2026-10', '2026-11', '2026-12']);
    expect(periodsFrom('2026-12', '2026-12')).toEqual(['2026-12']);
  });
});

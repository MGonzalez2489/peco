import {cronMatches} from './cron-matches.util';

const at = (value: string): Date => new Date(value);

describe('cronMatches', () => {
  it('matches the configured nightly run in UTC', () => {
    expect(cronMatches('0 3 * * *', at('2026-11-22T03:00:00.000Z'))).toBe(true);
    expect(cronMatches('0 3 * * *', at('2026-11-22T03:01:00.000Z'))).toBe(false);
    expect(cronMatches('0 3 * * *', at('2026-11-22T04:00:00.000Z'))).toBe(false);
  });

  it('supports steps, lists and ranges', () => {
    expect(cronMatches('*/15 * * * *', at('2026-11-22T10:45:00.000Z'))).toBe(true);
    expect(cronMatches('*/15 * * * *', at('2026-11-22T10:44:00.000Z'))).toBe(false);
    expect(cronMatches('0 1-5 * * 1,3', at('2026-11-23T02:00:00.000Z'))).toBe(true);
    expect(cronMatches('0 1-5 * * 1,3', at('2026-11-24T02:00:00.000Z'))).toBe(false);
  });

  it('treats day 7 as Sunday', () => {
    expect(cronMatches('0 0 * * 0', at('2026-11-22T00:00:00.000Z'))).toBe(true);
    expect(cronMatches('0 0 * * 7', at('2026-11-22T00:00:00.000Z'))).toBe(true);
  });

  it('uses OR semantics when both day fields are restricted', () => {
    expect(cronMatches('0 0 1 * 0', at('2026-11-22T00:00:00.000Z'))).toBe(true);
    expect(cronMatches('0 0 1 * 0', at('2026-12-01T00:00:00.000Z'))).toBe(true);
    expect(cronMatches('0 0 1 * 0', at('2026-11-23T00:00:00.000Z'))).toBe(false);
  });

  it('rejects malformed expressions', () => {
    expect(cronMatches('0 3 * *', at('2026-11-22T03:00:00.000Z'))).toBe(false);
    expect(cronMatches('60 3 * * *', at('2026-11-22T03:00:00.000Z'))).toBe(false);
    expect(cronMatches('0 3 * * */0', at('2026-11-22T03:00:00.000Z'))).toBe(false);
  });
});

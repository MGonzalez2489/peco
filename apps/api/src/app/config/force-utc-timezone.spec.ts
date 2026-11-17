import {forceUtcTimezone} from './force-utc-timezone';

describe('forceUtcTimezone', () => {
  it('forces the process timezone to UTC', () => {
    const original = process.env.TZ;
    try {
      forceUtcTimezone();
      expect(process.env.TZ).toBe('UTC');
    } finally {
      if (original === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = original;
      }
    }
  });
});

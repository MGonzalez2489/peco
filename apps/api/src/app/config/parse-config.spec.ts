import {AppConfig} from './app-config';
import {ConfigurationError} from './configuration.error';
import {parseConfig} from './parse-config';

const parse = (env: NodeJS.ProcessEnv = {}): AppConfig => parseConfig(env);

const PRODUCTION_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_HOST: 'db.internal',
  DATABASE_PORT: '3306',
  DATABASE_USER: 'peco',
  DATABASE_PASSWORD: 'production-password',
  DATABASE_NAME: 'peco',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('parseConfig', () => {
  describe('base settings', () => {
    it('uses the documented defaults', () => {
      const config = parse();

      expect(config.env).toBe('development');
      expect(config.port).toBe(3000);
    });

    it.each(['not-a-number', '0', '70000'])('rejects invalid PORT=%s and names it', (value) => {
      expect(() => parse({PORT: value})).toThrow(ConfigurationError);
      expect(() => parse({PORT: value})).toThrow(/PORT/);
    });

    it('rejects an unknown NODE_ENV and names it', () => {
      expect(() => parse({NODE_ENV: 'staging'})).toThrow(/NODE_ENV/);
    });
  });

  describe('database settings', () => {
    it('uses the documented development defaults', () => {
      expect(parse().database).toMatchObject({
        host: 'localhost',
        port: 3306,
        user: 'peco',
        password: 'peco',
        name: 'peco',
        poolSize: 10,
        healthPingTimeoutMs: 1000,
      });
    });

    it('rejects an invalid DATABASE_PORT and names it', () => {
      expect(() => parse({DATABASE_PORT: 'abc'})).toThrow(/DATABASE_PORT/);
    });

    it('requires database variables in production and names the first missing one', () => {
      expect(() => parse({NODE_ENV: 'production'})).toThrow(/DATABASE_HOST/);
      expect(() => parse({...PRODUCTION_ENV, DATABASE_NAME: ''})).toThrow(/DATABASE_NAME/);
    });
  });

  describe('secrets', () => {
    it('provides valid, distinct development defaults', () => {
      const {jwt} = parse();

      expect(jwt.accessSecret.length).toBeGreaterThanOrEqual(32);
      expect(jwt.refreshSecret.length).toBeGreaterThanOrEqual(32);
      expect(jwt.accessSecret).not.toBe(jwt.refreshSecret);
    });

    it('rejects a short JWT_ACCESS_SECRET and names it', () => {
      expect(() => parse({JWT_ACCESS_SECRET: 'short'})).toThrow(/JWT_ACCESS_SECRET/);
    });

    it('rejects identical secrets and names the second one', () => {
      const secret = 'x'.repeat(32);

      expect(() => parse({JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: secret})).toThrow(
        /JWT_REFRESH_SECRET/,
      );
    });

    it('requires both secrets in production and names the missing one', () => {
      expect(() => parse({...PRODUCTION_ENV, JWT_ACCESS_SECRET: ''})).toThrow(/JWT_ACCESS_SECRET/);
      expect(() => parse({...PRODUCTION_ENV, JWT_REFRESH_SECRET: undefined})).toThrow(
        /JWT_REFRESH_SECRET/,
      );
    });
  });

  describe('token durations', () => {
    it('uses the documented TTL defaults', () => {
      expect(parse().tokens).toEqual({access: '15m', refresh: '30m', reset: '45m'});
    });

    it('rejects an invalid ACCESS_TOKEN_TTL and names it', () => {
      expect(() => parse({ACCESS_TOKEN_TTL: '15x'})).toThrow(/ACCESS_TOKEN_TTL/);
    });
  });

  describe('operational limits', () => {
    it('uses the documented defaults', () => {
      expect(parse().operational).toEqual({
        idempotencyTtlHours: 24,
        inactiveUserDays: 90,
        inactiveGraceDays: 7,
        maxBackfillMonths: 120,
        catchupBatchSize: 500,
      });
    });

    it('rejects a negative INACTIVE_USER_DAYS and names it', () => {
      expect(() => parse({INACTIVE_USER_DAYS: '-1'})).toThrow(/INACTIVE_USER_DAYS/);
    });
  });

  describe('job schedules', () => {
    it('uses the documented cron defaults', () => {
      expect(parse().jobs).toEqual({
        autoApplyCron: '5 0 * * *',
        periodCloseCron: '10 0 * * *',
        reconciliationCron: '0 3 * * *',
      });
    });

    it('rejects an invalid AUTO_APPLY_CRON and names it', () => {
      expect(() => parse({AUTO_APPLY_CRON: '5 0 * *'})).toThrow(/AUTO_APPLY_CRON/);
    });
  });

  describe('behavioural settings', () => {
    it('uses the documented defaults', () => {
      const config = parse();

      expect(config.corsOrigins).toEqual([]);
      expect(config.logLevel).toBe('info');
      expect(config.mailTransport).toBe('capture');
      expect(config.rateLimitEnabled).toBe(true);
    });

    it('parses a comma-separated CORS allowlist', () => {
      expect(parse({CORS_ORIGINS: ' https://a.test , https://b.test , '}).corsOrigins).toEqual([
        'https://a.test',
        'https://b.test',
      ]);
    });

    it('rejects an invalid LOG_LEVEL and names it', () => {
      expect(() => parse({LOG_LEVEL: 'verbose'})).toThrow(/LOG_LEVEL/);
    });

    it('rejects an invalid RATE_LIMIT_ENABLED and names it', () => {
      expect(() => parse({RATE_LIMIT_ENABLED: 'maybe'})).toThrow(/RATE_LIMIT_ENABLED/);
    });

    it('forbids debug logging and disabled rate limiting in production', () => {
      expect(() => parse({...PRODUCTION_ENV, LOG_LEVEL: 'debug'})).toThrow(/LOG_LEVEL/);
      expect(() => parse({...PRODUCTION_ENV, RATE_LIMIT_ENABLED: 'false'})).toThrow(
        /RATE_LIMIT_ENABLED/,
      );
    });
  });
});

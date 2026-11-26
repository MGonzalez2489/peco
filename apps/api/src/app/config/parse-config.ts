import {AppConfig} from './app-config';
import {ConfigurationError} from './configuration.error';

type Env = NodeJS.ProcessEnv;

type JwtSecrets = AppConfig['jwt'];

const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const;
const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
const MAIL_TRANSPORTS = ['capture', 'smtp'] as const;
const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;

/** Development-only fallbacks; production never uses them. */
const DEV_DEFAULTS = {
  databaseHost: 'localhost',
  databasePort: 3306,
  databaseUser: 'peco',
  databasePassword: 'peco',
  databaseName: 'peco',
  accessSecret: 'dev-only-access-secret-not-for-production-01',
  refreshSecret: 'dev-only-refresh-secret-not-for-production-02',
} as const;

const invalid = (name: string, reason: string): never => {
  throw new ConfigurationError(`Invalid configuration "${name}": ${reason}`);
};

const readString = (env: Env, name: string, fallback?: string): string => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return fallback === undefined ? invalid(name, 'value is required') : fallback;
  }
  return value;
};

const readOptionalToken = (env: Env, name: string): string | undefined => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length < 16) {
    return invalid(name, 'must be at least 16 characters');
  }
  return trimmed;
};

const readInteger = (
  env: Env,
  name: string,
  fallback: number,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): number => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    return invalid(name, `expected an integer between ${min} and ${max}, received "${value}"`);
  }
  return parsed;
};

const readBoolean = (env: Env, name: string, fallback: boolean): boolean => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  return invalid(name, `expected "true" or "false", received "${value}"`);
};

const readEnum = <T extends string>(
  env: Env,
  name: string,
  allowed: readonly T[],
  fallback: T,
): T => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  if (!allowed.includes(value as T)) {
    return invalid(name, `expected one of ${allowed.join(', ')}, received "${value}"`);
  }
  return value as T;
};

const readDuration = (env: Env, name: string, fallback: string): string => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const trimmed = value.trim();
  const match = DURATION_PATTERN.exec(trimmed);
  if (!match || Number(match[1]) <= 0) {
    return invalid(name, `expected a positive duration like "15m", received "${value}"`);
  }
  return trimmed;
};

const readCron = (env: Env, name: string, fallback: string): string => {
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return fallback;
  }
  const trimmed = value.trim();
  if (trimmed.split(/\s+/).length !== 5) {
    return invalid(name, `expected a 5-field cron expression, received "${value}"`);
  }
  return trimmed;
};

const readCorsOrigins = (env: Env): readonly string[] => {
  const value = env.CORS_ORIGINS;
  if (value === undefined || value.trim() === '') {
    return [];
  }
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const readDatabasePort = (env: Env, production: boolean): number => {
  const value = env.DATABASE_PORT;
  if (production && (value === undefined || value.trim() === '')) {
    return invalid('DATABASE_PORT', 'value is required in production');
  }
  return readInteger(env, 'DATABASE_PORT', DEV_DEFAULTS.databasePort, 1, 65535);
};

const readJwtSecrets = (env: Env, production: boolean): JwtSecrets => {
  const accessSecret = production
    ? readString(env, 'JWT_ACCESS_SECRET')
    : readString(env, 'JWT_ACCESS_SECRET', DEV_DEFAULTS.accessSecret);
  const refreshSecret = production
    ? readString(env, 'JWT_REFRESH_SECRET')
    : readString(env, 'JWT_REFRESH_SECRET', DEV_DEFAULTS.refreshSecret);

  if (accessSecret.length < 32) {
    return invalid('JWT_ACCESS_SECRET', 'must be at least 32 characters');
  }
  if (refreshSecret.length < 32) {
    return invalid('JWT_REFRESH_SECRET', 'must be at least 32 characters');
  }
  if (accessSecret === refreshSecret) {
    return invalid('JWT_REFRESH_SECRET', 'must differ from JWT_ACCESS_SECRET');
  }

  return {accessSecret, refreshSecret};
};

/** Parse and validate the environment once. Any error names the offending variable. */
export const parseConfig = (env: Env = process.env): AppConfig => {
  const nodeEnv = readEnum(env, 'NODE_ENV', NODE_ENVIRONMENTS, 'development');
  const production = nodeEnv === 'production';

  const port = readInteger(env, 'PORT', 3000, 1, 65535);

  const logLevel = readEnum(env, 'LOG_LEVEL', LOG_LEVELS, 'info');
  if (production && logLevel === 'debug') {
    invalid('LOG_LEVEL', '"debug" is not allowed in production');
  }

  const rateLimitEnabled = readBoolean(env, 'RATE_LIMIT_ENABLED', true);
  if (production && !rateLimitEnabled) {
    invalid('RATE_LIMIT_ENABLED', 'must be enabled in production');
  }

  return {
    env: nodeEnv,
    port,
    database: {
      host: production
        ? readString(env, 'DATABASE_HOST')
        : readString(env, 'DATABASE_HOST', DEV_DEFAULTS.databaseHost),
      port: readDatabasePort(env, production),
      user: production
        ? readString(env, 'DATABASE_USER')
        : readString(env, 'DATABASE_USER', DEV_DEFAULTS.databaseUser),
      password: production
        ? readString(env, 'DATABASE_PASSWORD')
        : readString(env, 'DATABASE_PASSWORD', DEV_DEFAULTS.databasePassword),
      name: production
        ? readString(env, 'DATABASE_NAME')
        : readString(env, 'DATABASE_NAME', DEV_DEFAULTS.databaseName),
      poolSize: readInteger(env, 'DATABASE_POOL_SIZE', 10, 1, 100),
      healthPingTimeoutMs: readInteger(env, 'HEALTH_DB_TIMEOUT_MS', 1000, 1, 60000),
    },
    jwt: readJwtSecrets(env, production),
    tokens: {
      access: readDuration(env, 'ACCESS_TOKEN_TTL', '15m'),
      refresh: readDuration(env, 'REFRESH_TOKEN_TTL', '30m'),
      reset: readDuration(env, 'RESET_TOKEN_TTL', '45m'),
    },
    operational: {
      idempotencyTtlHours: readInteger(env, 'IDEMPOTENCY_TTL_HOURS', 24, 1, 168),
      inactiveUserDays: readInteger(env, 'INACTIVE_USER_DAYS', 90, 1),
      inactiveGraceDays: readInteger(env, 'INACTIVE_GRACE_DAYS', 7, 1),
      maxBackfillMonths: readInteger(env, 'MAX_BACKFILL_MONTHS', 120, 1),
      catchupBatchSize: readInteger(env, 'CATCHUP_BATCH_SIZE', 500, 1),
      cleanupBatchSize: readInteger(env, 'CLEANUP_BATCH_SIZE', 1000, 1, 100_000),
      auditLogRetentionDays: readInteger(env, 'AUDIT_LOG_RETENTION_DAYS', 730, 730),
    },
    jobs: {
      autoApplyCron: readCron(env, 'AUTO_APPLY_CRON', '5 0 * * *'),
      periodCloseCron: readCron(env, 'PERIOD_CLOSE_CRON', '10 0 * * *'),
      reconciliationCron: readCron(env, 'RECONCILIATION_CRON', '0 3 * * *'),
      cleanupCron: readCron(env, 'CLEANUP_CRON', '0 4 * * *'),
      jobLockTtlSeconds: readInteger(env, 'JOB_LOCK_TTL_SECONDS', 300, 1, 3600),
    },
    corsOrigins: readCorsOrigins(env),
    metricsToken: readOptionalToken(env, 'METRICS_TOKEN'),
    logLevel,
    mailTransport: readEnum(env, 'MAIL_TRANSPORT', MAIL_TRANSPORTS, 'capture'),
    rateLimitEnabled,
  };
};

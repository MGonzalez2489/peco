type NodeEnvironment = 'development' | 'production' | 'test';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type MailTransport = 'capture' | 'smtp';

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  name: string;
  poolSize: number;
  healthPingTimeoutMs: number;
}

interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
}

interface TokenTtls {
  access: string;
  refresh: string;
  reset: string;
}

interface OperationalLimits {
  idempotencyTtlHours: number;
  inactiveUserDays: number;
  inactiveGraceDays: number;
  maxBackfillMonths: number;
  catchupBatchSize: number;
  cleanupBatchSize: number;
  auditLogRetentionDays: number;
}

interface JobSchedules {
  autoApplyCron: string;
  periodCloseCron: string;
  reconciliationCron: string;
  cleanupCron: string;
  jobLockTtlSeconds: number;
}

/** Fully validated, immutable configuration produced once at boot (US-102). */
export interface AppConfig {
  readonly env: NodeEnvironment;
  readonly port: number;
  readonly database: DatabaseConfig;
  readonly jwt: JwtConfig;
  readonly tokens: TokenTtls;
  readonly operational: OperationalLimits;
  readonly jobs: JobSchedules;
  readonly corsOrigins: readonly string[];
  readonly metricsToken?: string;
  readonly logLevel: LogLevel;
  readonly mailTransport: MailTransport;
  readonly rateLimitEnabled: boolean;
}

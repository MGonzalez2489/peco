import {ConsoleLogger, type LogLevel} from '@nestjs/common';
import type {AppConfig} from '../../config/app-config';
import {getCorrelationId} from '../middleware/correlation-id.context';
import {redactSensitiveFields} from './redact-sensitive-fields';

type ConfiguredLogLevel = AppConfig['logLevel'];

const NEST_LOG_LEVELS: Record<ConfiguredLogLevel, LogLevel[]> = {
  debug: ['debug', 'log', 'warn', 'error', 'fatal'],
  info: ['log', 'warn', 'error', 'fatal'],
  warn: ['warn', 'error', 'fatal'],
  error: ['error', 'fatal'],
};

interface JsonLogOptions {
  context: string;
  logLevel: LogLevel;
  writeStreamType?: 'stdout' | 'stderr';
  errorStack?: unknown;
}

/**
 * One structured JSON line per log entry. The correlation id is taken from the
 * request's async context when one is active, and every payload is redacted
 * before serialization (13.2/13.1).
 */
export class JsonLogger extends ConsoleLogger {
  private readonly environment: AppConfig['env'];

  constructor(config: Pick<AppConfig, 'env' | 'logLevel'>) {
    super('Peco', {
      json: true,
      logLevels: NEST_LOG_LEVELS[config.logLevel],
    });
    this.environment = config.env;
  }

  protected override getJsonLogObject(message: unknown, options: JsonLogOptions) {
    const base = super.getJsonLogObject(message, options);
    const correlationId = getCorrelationId();

    return {
      ...base,
      service: 'peco-api',
      environment: this.environment,
      ...(correlationId ? {correlationId} : {}),
      message: redactSensitiveFields(base.message),
    };
  }
}

import {Injectable, Logger, type OnModuleDestroy, type OnModuleInit} from '@nestjs/common';
import {cronMatches} from '../../../common/utils/cron-matches.util';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {CleanupService} from './cleanup.service';

const TICK_MS = 60_000;

/** Dependency-free UTC minute tick that fires the configured retention cron. */
@Injectable()
export class CleanupScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastRunMinute?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    private readonly service: CleanupService,
  ) {}

  onModuleInit(): void {
    void this.runIfDue();
    this.timer = setInterval(() => void this.runIfDue(), TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Exposed for deterministic tests; the interval calls the same entry point. */
  async runIfDue(): Promise<void> {
    if (this.running) {
      return;
    }

    const now = new Date(this.clock.now());
    const cron = this.configService.config.jobs?.cleanupCron ?? '0 4 * * *';
    if (!cronMatches(cron, now)) {
      return;
    }

    const minute = now.toISOString().slice(0, 16);
    if (this.lastRunMinute === minute) {
      return;
    }
    this.lastRunMinute = minute;
    this.running = true;

    try {
      const result = await this.service.run();
      if (!result.acquired) {
        this.logger.warn('Cleanup skipped: another instance holds the run lock');
      } else {
        this.logger.log(
          `Cleanup removed ${result.idempotencyKeys} idempotency keys, ` +
            `${result.refreshTokens} refresh tokens and ${result.auditLogs} audit logs`,
        );
      }
    } catch (error: unknown) {
      this.logger.error('Cleanup failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}

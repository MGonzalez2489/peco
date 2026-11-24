import {Injectable, Logger, type OnModuleDestroy, type OnModuleInit} from '@nestjs/common';
import {cronMatches} from '../../../common/utils/cron-matches.util';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {AutoApplyService} from './auto-apply.service';

const TICK_MS = 60_000;

/** Dependency-free UTC minute tick that fires the configured auto-apply cron. */
@Injectable()
export class AutoApplyScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AutoApplyScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastRunMinute?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    private readonly service: AutoApplyService,
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
    if (!cronMatches(this.configService.config.jobs.autoApplyCron, now)) {
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
        this.logger.warn('Auto-apply skipped: another instance holds the run lock');
      } else if (result.errors > 0) {
        this.logger.warn(`Auto-apply finished with ${result.errors} isolated error(s)`);
      }
    } catch (error: unknown) {
      this.logger.error('Auto-apply failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}

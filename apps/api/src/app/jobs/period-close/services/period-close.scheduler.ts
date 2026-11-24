import {Injectable, Logger, type OnModuleDestroy, type OnModuleInit} from '@nestjs/common';
import {cronMatches} from '../../../common/utils/cron-matches.util';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import type {PeriodCloseJobResult} from '../types/period-close-job-result.type';
import type {PeriodCloseTrigger} from '../types/period-close-trigger.type';
import {PeriodCloseJobService} from './period-close-job.service';

const TICK_MS = 60_000;

/** Dependency-free UTC minute tick plus a one-shot startup sweep (11.7/D59). */
@Injectable()
export class PeriodCloseScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PeriodCloseScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastRunMinute?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    private readonly service: PeriodCloseJobService,
  ) {}

  onModuleInit(): void {
    void this.runStartupSweep();
    this.timer = setInterval(() => void this.runIfDue(), TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Startup is an accelerator; when the cron minute is current, the ordered cron path owns the run. */
  async runStartupSweep(): Promise<void> {
    const now = new Date(this.clock.now());
    if (cronMatches(this.configService.config.jobs.periodCloseCron, now)) {
      return;
    }
    await this.execute('startup');
  }

  /** Exposed for deterministic tests; the interval calls the same entry point. */
  async runIfDue(): Promise<void> {
    if (this.running) {
      return;
    }

    const now = new Date(this.clock.now());
    if (!cronMatches(this.configService.config.jobs.periodCloseCron, now)) {
      return;
    }

    const minute = now.toISOString().slice(0, 16);
    if (this.lastRunMinute === minute) {
      return;
    }

    const result = await this.execute('cron');
    // A deferred run must be retried as soon as auto-apply reports completion.
    if (result && !result.deferred) {
      this.lastRunMinute = minute;
    }
  }

  private async execute(trigger: PeriodCloseTrigger): Promise<PeriodCloseJobResult | undefined> {
    if (this.running) {
      return undefined;
    }

    this.running = true;
    try {
      const result = await this.service.run(trigger);
      if (result.deferred) {
        return result;
      }
      if (!result.acquired) {
        this.logger.warn('Period close skipped: another instance holds the run lock');
      } else if (result.postponed > 0) {
        this.logger.warn(`Period close postponed ${result.postponed} capped user(s)`);
      } else if (result.errors > 0) {
        this.logger.warn(`Period close finished with ${result.errors} isolated error(s)`);
      }
      return result;
    } catch (error: unknown) {
      this.logger.error(
        'Period close failed',
        error instanceof Error ? error.stack : String(error),
      );
      return undefined;
    } finally {
      this.running = false;
    }
  }
}

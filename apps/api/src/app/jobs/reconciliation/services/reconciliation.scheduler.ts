import {Injectable, Logger, type OnModuleDestroy, type OnModuleInit} from '@nestjs/common';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {cronMatches} from '../utils/cron-matches.util';
import {ReconciliationService} from './reconciliation.service';

const TICK_MS = 60_000;

/** Dependency-free UTC minute tick that fires the configured cron expression. */
@Injectable()
export class ReconciliationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReconciliationScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastRunMinute?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    private readonly service: ReconciliationService,
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
    if (!cronMatches(this.configService.config.jobs.reconciliationCron, now)) {
      return;
    }

    const minute = now.toISOString().slice(0, 16);
    if (this.lastRunMinute === minute) {
      return;
    }
    this.lastRunMinute = minute;
    this.running = true;

    try {
      const result = await this.service.reconcile();
      if (!result.acquired) {
        this.logger.warn('Reconciliation skipped: another instance holds the run lock');
      }
    } catch (error: unknown) {
      this.logger.error('Reconciliation failed', error instanceof Error ? error.stack : String(error));
    } finally {
      this.running = false;
    }
  }
}

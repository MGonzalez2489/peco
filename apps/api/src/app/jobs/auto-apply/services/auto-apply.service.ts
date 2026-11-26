import {Injectable, Logger, Optional} from '@nestjs/common';
import {JobKeyEnum, JobStatusEnum, type StringEnumValues} from '@peco/enums';
import {MetricsService} from '../../../common/observability/metrics.service';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {ScheduledTransactionsService} from '../../../scheduled-transactions/scheduled-transactions.service';
import type {AutoApplyResult} from '../types/auto-apply-result.type';
import {AutoApplyRepository} from './auto-apply.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type JobStatus = StringEnumValues<typeof JobStatusEnum>;

const elapsedMs = (startedAt: bigint): number =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

/** Nightly catch-up for active users, reusing the idempotent on-demand executor (12/D54/D57/D58). */
@Injectable()
export class AutoApplyService {
  private readonly logger = new Logger(AutoApplyService.name);
  private readonly cappedUserPublicIds: string[] = [];
  private lastCompletedAsOf?: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly clock: UtcClock,
    private readonly repository: AutoApplyRepository,
    private readonly schedules: ScheduledTransactionsService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  /** True only after an acquired run finished for the requested UTC date (11.7). */
  hasCompletedForDate(asOf: string): boolean {
    return this.lastCompletedAsOf === asOf;
  }

  /** Hands the pending cap signal to one close run, so the postpone lasts one run. */
  takeCappedUserPublicIds(): string[] {
    return this.cappedUserPublicIds.splice(0);
  }

  async run(): Promise<AutoApplyResult> {
    const startedAt = process.hrtime.bigint();
    const jobKey = JobKeyEnum.AUTO_APPLY.toString();
    const finish = (status: JobStatus): void => {
      this.metrics?.recordJobRun(jobKey, status, elapsedMs(startedAt));
    };
    const now = this.clock.now();
    const asOf = now.slice(0, 10);
    const inactiveDays = this.configService.config.operational.inactiveUserDays;
    const activeSince = new Date(Date.parse(now) - inactiveDays * MS_PER_DAY).toISOString();
    const batchSize = this.configService.config.operational.catchupBatchSize;
    let errors = 0;

    const run = await this.repository.withLock(async () => {
      const users = await this.repository.findEligibleUserPublicIds(activeSince, asOf);
      const totals = {
        usersProcessed: users.length,
        applied: 0,
        skipped: 0,
        failed: 0,
        skippedWhileInactive: 0,
      };

      for (const {publicId} of users) {
        try {
          const result = await this.schedules.applyDue(publicId, {asOf}, null, {
            autoApply: true,
            onScheduleError: (_schedulePublicId: string, error: unknown) => {
              errors += 1;
              this.logger.error(
                'Auto-apply failed for a schedule',
                error instanceof Error ? error.stack : String(error),
              );
            },
          });

          totals.applied += result.applied;
          totals.skipped += result.skipped;
          totals.failed += result.failed;
          totals.skippedWhileInactive += result.skippedWhileInactive;

          if (result.results.length >= batchSize) {
            if (!this.cappedUserPublicIds.includes(publicId)) {
              this.cappedUserPublicIds.push(publicId);
            }
            this.logger.warn(
              `Auto-apply hit the ${batchSize}-occurrence cap for one user; closing waits for the next run`,
            );
          }
        } catch (error: unknown) {
          errors += 1;
          this.logger.error(
            'Auto-apply failed while processing a user',
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      return totals;
    });

    const cappedUserPublicIds = [...this.cappedUserPublicIds];
    if (run === null) {
      finish(JobStatusEnum.SKIPPED.toString());
      return {
        acquired: false,
        usersProcessed: 0,
        applied: 0,
        skipped: 0,
        failed: 0,
        skippedWhileInactive: 0,
        errors: 0,
        cappedUserPublicIds,
      };
    }

    this.lastCompletedAsOf = asOf;
    finish(errors > 0 ? JobStatusEnum.FAILED.toString() : JobStatusEnum.SUCCESS.toString());
    this.metrics?.addProcessedUsers(jobKey, run.usersProcessed);
    this.metrics?.addOccurrencesApplied(run.applied);
    this.metrics?.addOccurrencesSkipped(run.skipped);
    this.metrics?.addOccurrencesFailed(run.failed + errors);
    return {acquired: true, ...run, errors, cappedUserPublicIds};
  }
}

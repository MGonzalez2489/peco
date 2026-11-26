import {Injectable, Logger, Optional} from '@nestjs/common';
import {JobKeyEnum, JobStatusEnum, type StringEnumValues} from '@peco/enums';
import {MetricsService} from '../../../common/observability/metrics.service';
import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {PeriodClosingService} from '../../../periods/services/period-closing.service';
import {AutoApplyService} from '../../auto-apply/services/auto-apply.service';
import {AUTO_APPLY_CAP_POSTPONED_CODE} from '../constants/auto-apply-cap-postponed-code.constant';
import {PERIOD_CLOSE_ORDER_DEFERRED_CODE} from '../constants/period-close-order-deferred-code.constant';
import type {PeriodCloseJobResult} from '../types/period-close-job-result.type';
import type {PeriodCloseTrigger} from '../types/period-close-trigger.type';
import {PeriodCloseRepository} from './period-close.repository';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type JobStatus = StringEnumValues<typeof JobStatusEnum>;

const elapsedMs = (startedAt: bigint): number =>
  Number(process.hrtime.bigint() - startedAt) / 1_000_000;

const emptyResult = (trigger: PeriodCloseTrigger, deferred: boolean): PeriodCloseJobResult => ({
  acquired: false,
  deferred,
  trigger,
  usersProcessed: 0,
  closed: 0,
  repaired: 0,
  truncated: 0,
  errors: 0,
  postponed: 0,
});

/** Daily and startup trigger for the shared bounded closing service (11.7/12/D59). */
@Injectable()
export class PeriodCloseJobService {
  private readonly logger = new Logger(PeriodCloseJobService.name);

  constructor(
    private readonly repository: PeriodCloseRepository,
    private readonly closing: PeriodClosingService,
    private readonly autoApply: AutoApplyService,
    private readonly clock: UtcClock,
    private readonly configService: ConfigService,
    @Optional() private readonly metrics?: MetricsService,
  ) {}

  async run(trigger: PeriodCloseTrigger = 'cron'): Promise<PeriodCloseJobResult> {
    const startedAt = process.hrtime.bigint();
    const jobKey = JobKeyEnum.PERIOD_CLOSE.toString();
    const finish = (status: JobStatus): void => {
      this.metrics?.recordJobRun(jobKey, status, elapsedMs(startedAt));
    };
    const now = this.clock.now();
    const asOf = now.slice(0, 10);

    if (trigger === 'cron' && !this.autoApply.hasCompletedForDate(asOf)) {
      this.logger.warn({
        code: PERIOD_CLOSE_ORDER_DEFERRED_CODE,
        asOf,
        requiredBefore: 'auto-apply',
      });
      finish(JobStatusEnum.SKIPPED.toString());
      return emptyResult(trigger, true);
    }

    const inactiveDays = this.configService.config.operational.inactiveUserDays;
    const activeSince = new Date(Date.parse(now) - inactiveDays * MS_PER_DAY).toISOString();

    const run = await this.repository.withLock(async () => {
      const users = await this.repository.findActiveUserPublicIds(activeSince);
      const active = new Set(users.map(({publicId}) => publicId));
      const capped = this.autoApply
        .takeCappedUserPublicIds()
        .filter((publicId) => active.has(publicId));
      const cappedSet = new Set(capped);
      const batchSize = this.configService.config.operational.catchupBatchSize;

      for (let count = 0; count < capped.length; count += 1) {
        this.logger.warn({
          code: AUTO_APPLY_CAP_POSTPONED_CODE,
          asOf,
          batchSize,
        });
      }

      const queue = users
        .filter(({publicId}) => !cappedSet.has(publicId))
        .map(({publicId}) => publicId);
      const totals = await this.closing.backfill(queue);

      return {
        ...totals,
        usersProcessed: users.length,
        postponed: capped.length,
      };
    });

    if (run === null) {
      finish(JobStatusEnum.SKIPPED.toString());
      return emptyResult(trigger, false);
    }

    finish(run.errors > 0 ? JobStatusEnum.FAILED.toString() : JobStatusEnum.SUCCESS.toString());
    this.metrics?.addProcessedUsers(jobKey, run.usersProcessed);
    this.metrics?.addPeriodsClosed(run.closed);
    return {acquired: true, deferred: false, trigger, ...run};
  }
}

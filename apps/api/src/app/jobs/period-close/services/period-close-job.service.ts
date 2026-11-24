import {Injectable, Logger} from '@nestjs/common';
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
  ) {}

  async run(trigger: PeriodCloseTrigger = 'cron'): Promise<PeriodCloseJobResult> {
    const now = this.clock.now();
    const asOf = now.slice(0, 10);

    if (trigger === 'cron' && !this.autoApply.hasCompletedForDate(asOf)) {
      this.logger.warn({
        code: PERIOD_CLOSE_ORDER_DEFERRED_CODE,
        asOf,
        requiredBefore: 'auto-apply',
      });
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

      for (const publicId of capped) {
        this.logger.warn({
          code: AUTO_APPLY_CAP_POSTPONED_CODE,
          userPublicId: publicId,
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
      return emptyResult(trigger, false);
    }

    return {acquired: true, deferred: false, trigger, ...run};
  }
}

import {HttpStatus, Injectable, Logger} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {UtcClock} from '../../database/clock/utc-clock';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {ConfigService} from '../../config/config.service';
import {PERIOD_BACKFILL_TRUNCATED_CODE} from '../constants/period-backfill-truncated-code.constant';
import {SNAPSHOT_GAP_REPAIRED_CODE} from '../constants/snapshot-gap-repaired-code.constant';
import {PeriodSnapshotResponseDto} from '../dto/period-snapshot-response.dto';
import type {PeriodBackfillResult} from '../types/period-backfill-result.type';
import type {PeriodCloseOutcome} from '../types/period-close-outcome.type';
import type {PeriodCloseResult} from '../types/period-close-result.type';
import {firstMissingPeriod} from '../utils/first-missing-period.util';
import {nextPeriod} from '../utils/next-period.util';
import {periodBeforeActivityException} from '../utils/period-before-activity.exception';
import {periodNotClosableException} from '../utils/period-not-closable.exception';
import {periodsFrom} from '../utils/periods-from.util';
import {previousPeriod} from '../utils/previous-period.util';
import {PeriodClosingRepository} from './period-closing.repository';

/** Application entry point for closing a month and its missing predecessors (11.5/11.7). */
@Injectable()
export class PeriodClosingService {
  private readonly logger = new Logger(PeriodClosingService.name);

  constructor(
    private readonly repository: PeriodClosingRepository,
    private readonly users: UserProfileRepository,
    private readonly clock: UtcClock,
    private readonly configService: ConfigService,
  ) {}

  async close(userPublicId: string, period: string): Promise<PeriodCloseOutcome> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw this.apiException(ApiErrorCodeEnum.NOT_FOUND.toString());
    }

    if (period >= this.clock.now().slice(0, 7)) {
      throw periodNotClosableException();
    }

    const firstActivity = await this.repository.findFirstActivityPeriod(user.id);
    if (!firstActivity) {
      throw this.apiException(ApiErrorCodeEnum.NOT_FOUND.toString());
    }
    if (period < firstActivity) {
      throw periodBeforeActivityException();
    }

    const closed = await this.repository.findClosedPeriods(user.id, firstActivity);
    const candidates = this.missingPeriods(firstActivity, period, closed);
    if (closed.includes(period)) {
      candidates.push(period);
    }

    // Only missing months are recomputed; an already stored target is replayed
    // so the D65 response keeps its original 201/200 semantics (D119).
    let result: PeriodCloseResult | null = null;
    for (const candidate of candidates) {
      this.warnOnGapRepair(userPublicId, candidate, closed);
      result = await this.repository.close(user.id, candidate);
      if ('status' in result) {
        throw this.mapFailure(result);
      }
    }

    if (!result || 'status' in result) {
      throw this.apiException(ApiErrorCodeEnum.NOT_FOUND.toString());
    }

    return {
      snapshot: new PeriodSnapshotResponseDto(result.snapshot, result.balances),
      created: result.created,
    };
  }

  /**
   * Bounded multi-user sweep up to the previous month (11.5). A failing user is
   * logged and skipped so the remaining queue is still processed.
   */
  async backfill(
    userPublicIds: readonly string[],
    targetPeriod?: string,
  ): Promise<PeriodBackfillResult> {
    const target = targetPeriod ?? previousPeriod(this.clock.now().slice(0, 7));
    const cap = this.configService.config.operational.maxBackfillMonths;
    const totals: PeriodBackfillResult = {
      usersProcessed: userPublicIds.length,
      closed: 0,
      repaired: 0,
      truncated: 0,
      errors: 0,
    };

    for (const userPublicId of userPublicIds) {
      try {
        const user = await this.users.findActiveByPublicId(userPublicId);
        if (!user) {
          throw new Error('active user not found');
        }

        const firstActivity = await this.repository.findFirstActivityPeriod(user.id);
        if (!firstActivity || firstActivity > target) {
          continue;
        }

        const closed = await this.repository.findClosedPeriods(user.id, firstActivity);
        const missing = this.missingPeriods(firstActivity, target, closed);
        const scheduled = missing.slice(0, cap);

        if (missing.length > cap) {
          const last = scheduled[scheduled.length - 1];
          totals.truncated += 1;
          this.logger.warn({
            code: PERIOD_BACKFILL_TRUNCATED_CODE,
            userPublicId,
            closedThrough: last,
            nextPeriod: nextPeriod(last),
            remaining: missing.length - scheduled.length,
          });
        }

        for (const period of scheduled) {
          const repair = this.isGapRepair(period, closed);
          if (repair) {
            this.warnOnGapRepair(userPublicId, period, closed);
          }

          const result = await this.repository.close(user.id, period);
          if ('status' in result) {
            throw this.mapFailure(result);
          }

          totals.closed += 1;
          if (repair) {
            totals.repaired += 1;
          }
        }
      } catch (error: unknown) {
        totals.errors += 1;
        this.logger.error(
          `Period backfill failed for user ${userPublicId}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return totals;
  }

  private missingPeriods(from: string, to: string, closed: readonly string[]): string[] {
    const firstMissing = firstMissingPeriod(from, to, closed);
    if (!firstMissing) {
      return [];
    }

    const closedSet = new Set(closed);
    return periodsFrom(firstMissing, to).filter((period) => !closedSet.has(period));
  }

  private isGapRepair(period: string, closed: readonly string[]): boolean {
    return closed.some((closedPeriod) => closedPeriod > period);
  }

  private warnOnGapRepair(
    userPublicId: string,
    period: string,
    closed: readonly string[],
  ): void {
    if (!this.isGapRepair(period, closed)) {
      return;
    }

    this.logger.warn({
      code: SNAPSHOT_GAP_REPAIRED_CODE,
      userPublicId,
      period,
      nextClosedPeriod: closed.find((closedPeriod) => closedPeriod > period),
    });
  }

  private mapFailure(
    result: Exclude<PeriodCloseResult, {created: boolean}>,
  ): ApiException {
    if (result.status === ApiErrorCodeEnum.PERIOD_NOT_CLOSABLE.toString()) {
      return periodNotClosableException();
    }
    if (result.status === ApiErrorCodeEnum.PERIOD_BEFORE_ACTIVITY.toString()) {
      return periodBeforeActivityException();
    }
    return this.apiException(ApiErrorCodeEnum.NOT_FOUND.toString());
  }

  private apiException(code: 'NOT_FOUND'): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, code, API_ERROR_MESSAGES[code]);
  }
}

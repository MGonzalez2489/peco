import {HttpStatus, Injectable} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {UtcClock} from '../../database/clock/utc-clock';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {PeriodSnapshotResponseDto} from '../dto/period-snapshot-response.dto';
import type {PeriodCloseOutcome} from '../types/period-close-outcome.type';
import type {PeriodCloseResult} from '../types/period-close-result.type';
import {periodBeforeActivityException} from '../utils/period-before-activity.exception';
import {periodNotClosableException} from '../utils/period-not-closable.exception';
import {periodsFrom} from '../utils/periods-from.util';
import {PeriodClosingRepository} from './period-closing.repository';

/** Application entry point for closing a month and its missing predecessors (11.5/11.7). */
@Injectable()
export class PeriodClosingService {
  constructor(
    private readonly repository: PeriodClosingRepository,
    private readonly users: UserProfileRepository,
    private readonly clock: UtcClock,
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

    // Oldest-first walk: a missing month between the first activity and the
    // requested period is closed in the same call (11.5). An already closed
    // month is replayed by the repository, so the walk is idempotent.
    let result: PeriodCloseResult | null = null;
    for (const candidate of periodsFrom(firstActivity, period)) {
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

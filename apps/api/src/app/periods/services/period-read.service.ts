import {Injectable} from '@nestjs/common';
import type {ListPeriodsQuery} from '@peco/contracts';
import {UtcClock} from '../../database/clock/utc-clock';
import type {UserEntity} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {MAX_PERIOD_RANGE_MONTHS} from '../constants/max-period-range-months.constant';
import {PeriodSnapshotResponseDto} from '../dto/period-snapshot-response.dto';
import {PeriodSummaryResponseDto} from '../dto/period-summary-response.dto';
import {periodRangeMonthCount} from '../utils/period-range-month-count.util';
import {periodRangeException} from '../utils/period-range.exception';
import {periodReadException} from '../utils/period-read.exception';
import {previousPeriod} from '../utils/previous-period.util';
import {PeriodReadRepository} from './period-read.repository';

/** Owner-scoped reads over snapshots that can no longer be recalculated (8.12). */
@Injectable()
export class PeriodReadService {
  constructor(
    private readonly repository: PeriodReadRepository,
    private readonly users: UserProfileRepository,
    private readonly clock: UtcClock,
  ) {}

  /** Summaries in the default 12-month window or the requested inclusive range, newest first. */
  async list(
    userPublicId: string,
    query: ListPeriodsQuery,
  ): Promise<PeriodSummaryResponseDto[]> {
    const user = await this.requireUser(userPublicId);
    const {from, to} = this.resolveRange(query);
    const snapshots = await this.repository.list(user.id, from, to);

    return snapshots.map((snapshot) => new PeriodSummaryResponseDto(snapshot));
  }

  /** The caller's complete frozen snapshot or a stable 404 (8.12). */
  async find(userPublicId: string, period: string): Promise<PeriodSnapshotResponseDto> {
    const user = await this.requireUser(userPublicId);
    const result = await this.repository.findByPeriod(user.id, period);
    if (!result) {
      throw periodReadException();
    }

    return new PeriodSnapshotResponseDto(result.snapshot, result.balances);
  }

  private async requireUser(userPublicId: string): Promise<UserEntity> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw periodReadException();
    }
    return user;
  }

  private resolveRange(query: ListPeriodsQuery): {from: string; to: string} {
    const to = query.to ?? previousPeriod(this.clock.now().slice(0, 7));
    let from = query.from;
    if (!from) {
      from = to;
      for (let month = 1; month < 12; month += 1) {
        from = previousPeriod(from);
      }
    }

    const months = periodRangeMonthCount(from, to);
    if (months === 0 || months > MAX_PERIOD_RANGE_MONTHS) {
      throw periodRangeException();
    }

    return {from, to};
  }
}

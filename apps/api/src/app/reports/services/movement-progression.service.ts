import {Injectable} from '@nestjs/common';
import type {MovementProgressionResponse} from '@peco/contracts';
import {UtcClock} from '../../database/clock/utc-clock';
import {periodReadException} from '../../periods/utils/period-read.exception';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {buildMovementProgression} from '../utils/build-movement-progression.util';
import {MovementProgressionRepository} from './movement-progression.repository';

/**
 * Owner-scoped cumulative movement series (US-803). A closed month with the
 * default reversal policy reports the frozen snapshot totals; every other path
 * derives the same §8.13 shape from the caller's ledger.
 */
@Injectable()
export class MovementProgressionService {
  constructor(
    private readonly users: UserProfileRepository,
    private readonly progression: MovementProgressionRepository,
    private readonly clock: UtcClock,
  ) {}

  async find(
    userPublicId: string,
    period: string,
    excludeReversals = false,
  ): Promise<MovementProgressionResponse> {
    const user = await this.users.findActiveByPublicId(userPublicId);
    if (!user) {
      throw periodReadException();
    }

    const currentPeriod = this.clock.now().slice(0, 7);
    const frozen =
      period < currentPeriod && !excludeReversals
        ? await this.progression.findSnapshot(user.id, period)
        : null;
    const movements = await this.progression.findPeriodMovements(user.id, period);
    const {points, totals} = buildMovementProgression(
      period,
      movements,
      excludeReversals,
      frozen
        ? {totalInflows: frozen.totalInflows, totalOutflows: frozen.totalOutflows}
        : undefined,
    );

    return {period, points, totals};
  }
}

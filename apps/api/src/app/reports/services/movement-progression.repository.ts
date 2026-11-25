import {Injectable} from '@nestjs/common';
import {Between, DataSource, IsNull} from 'typeorm';
import {MovementEntity, PeriodSnapshotEntity} from '../../database/entities';
import {periodUtcBounds} from '../../movements/utils/period-utc-bounds.util';
import {PERIOD_LEDGER_BATCH_SIZE} from '../../periods/constants/period-ledger-batch-size.constant';
import type {MovementProgressionRow} from '../types/movement-progression-row.type';

/** Owner-scoped reads for the caller's frozen totals and monthly ledger rows (US-803). */
@Injectable()
export class MovementProgressionRepository {
  constructor(private readonly dataSource: DataSource) {}

  /** Frozen month totals, or null when the caller has no snapshot for it. */
  async findSnapshot(
    userId: number,
    period: string,
  ): Promise<PeriodSnapshotEntity | null> {
    return this.dataSource.getRepository(PeriodSnapshotEntity).findOne({
      select: {id: true, totalInflows: true, totalOutflows: true},
      where: {userId, period},
    });
  }

  /** Non-deleted movements of the UTC month, ordered by date then id. */
  async findPeriodMovements(
    userId: number,
    period: string,
  ): Promise<MovementProgressionRow[]> {
    const {from, to} = periodUtcBounds(period);
    const movements: MovementProgressionRow[] = [];
    let skip = 0;

    for (;;) {
      const batch = await this.dataSource.getRepository(MovementEntity).find({
        where: {userId, deletedAt: IsNull(), date: Between(from, to)},
        select: {
          id: true,
          date: true,
          type: true,
          amount: true,
          isCanceled: true,
          isReversal: true,
          isReversed: true,
        },
        order: {date: 'ASC', id: 'ASC'},
        take: PERIOD_LEDGER_BATCH_SIZE,
        skip,
      });
      movements.push(...batch);
      if (batch.length < PERIOD_LEDGER_BATCH_SIZE) {
        return movements;
      }
      skip += batch.length;
    }
  }
}

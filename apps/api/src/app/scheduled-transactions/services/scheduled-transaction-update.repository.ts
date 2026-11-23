import {Injectable} from '@nestjs/common';
import type {UpdateScheduledTransactionRequest} from '@peco/contracts';
import {MovementWriteStatusEnum} from '@peco/enums';
import {DataSource, type QueryDeepPartialEntity} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {ScheduledTransactionEntity} from '../../database/entities';
import type {ScheduledTransactionActiveValues} from '../types/scheduled-transaction-active-values.type';
import type {ScheduledTransactionUpdateResult} from '../types/scheduled-transaction-update-result.type';
import type {ScheduledTransactionUpdateValues} from '../types/scheduled-transaction-update-values.type';
import {ScheduledTransactionQueryRepository} from './scheduled-transaction-query.repository';

/** Atomic schedule writes; execution rows and movements are never rewritten (US-602/US-603). */
@Injectable()
export class ScheduledTransactionUpdateRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly queries: ScheduledTransactionQueryRepository,
    private readonly clock: UtcClock,
  ) {}

  update(
    userId: number,
    publicId: string,
    request: UpdateScheduledTransactionRequest,
    values: ScheduledTransactionUpdateValues,
  ): Promise<ScheduledTransactionUpdateResult> {
    return this.compareAndSet(userId, publicId, request.version, values);
  }

  /** Pause/resume writes only the schedule row with the same optimistic semantics (10.8). */
  setActive(
    userId: number,
    publicId: string,
    expectedVersion: number | undefined,
    values: ScheduledTransactionActiveValues,
  ): Promise<ScheduledTransactionUpdateResult> {
    return this.compareAndSet(userId, publicId, expectedVersion, values);
  }

  private async compareAndSet(
    userId: number,
    publicId: string,
    expectedVersion: number | undefined,
    values: ScheduledTransactionUpdateValues | ScheduledTransactionActiveValues,
  ): Promise<ScheduledTransactionUpdateResult> {
    const current = await this.queries.findOwnerDetail(userId, publicId);
    if (!current) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      return {
        status: MovementWriteStatusEnum.CONFLICT.toString(),
        currentVersion: current.version,
      };
    }

    const set = {
      ...values,
      version: () => '`version` + 1',
      updatedAt: this.clock.now(),
    } as QueryDeepPartialEntity<ScheduledTransactionEntity>;

    const query = this.dataSource
      .getRepository(ScheduledTransactionEntity)
      .createQueryBuilder()
      .update(ScheduledTransactionEntity)
      .set(set)
      .where('id = :id', {id: current.id})
      .andWhere('userId = :userId', {userId})
      .andWhere('deletedAt IS NULL');
    if (expectedVersion !== undefined) {
      query.andWhere('version = :expectedVersion', {expectedVersion});
    }

    const result = await query.execute();
    if (result.affected === 0) {
      const latest = await this.queries.findOwnerDetail(userId, publicId);
      return latest
        ? {status: MovementWriteStatusEnum.CONFLICT.toString(), currentVersion: latest.version}
        : {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const updated = await this.queries.findOwnerDetail(userId, publicId);
    return updated
      ? {status: MovementWriteStatusEnum.UPDATED.toString(), schedule: updated}
      : {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
  }
}

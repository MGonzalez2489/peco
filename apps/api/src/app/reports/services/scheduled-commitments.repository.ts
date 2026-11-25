import {Injectable} from '@nestjs/common';
import type {MovementType, ScheduledTransactionType} from '@peco/contracts';
import {ScheduledExecutionStatusEnum, ScheduledTransactionTypeEnum} from '@peco/enums';
import {DataSource, In, IsNull} from 'typeorm';
import {ScheduledExecutionEntity, ScheduledTransactionEntity} from '../../database/entities';
import type {ScheduledCommitmentAllocation} from '../types/scheduled-commitment-allocation.type';
import type {ScheduledCommitmentSchedule} from '../types/scheduled-commitment-schedule.type';

interface AppliedCommitmentRaw {
  executionId: string;
  scheduleType: ScheduledTransactionType;
  scheduleCategoryId: string;
  scheduleAmount: string;
  movementType: MovementType | null;
  movementCategoryId: string | null;
  movementAmount: string | null;
}

/** Owner-scoped applied executions and active schedules used by the commitments report (US-805). */
@Injectable()
export class ScheduledCommitmentsRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * APPLIED executions dated in the month. The linked movement supplies the
   * historical amount/category/type; the schedule is the fallback for an
   * execution whose movement is no longer readable.
   */
  async findApplied(
    userId: number,
    periodFrom: string,
    periodTo: string,
  ): Promise<ScheduledCommitmentAllocation[]> {
    const rows = await this.dataSource
      .getRepository(ScheduledExecutionEntity)
      .createQueryBuilder('execution')
      .innerJoin('execution.scheduledTransaction', 'schedule')
      .leftJoin('execution.movement', 'movement')
      .select('execution.id', 'executionId')
      .addSelect('schedule.type', 'scheduleType')
      .addSelect('schedule.categoryId', 'scheduleCategoryId')
      .addSelect('schedule.estimatedAmount', 'scheduleAmount')
      .addSelect('movement.type', 'movementType')
      .addSelect('movement.categoryId', 'movementCategoryId')
      .addSelect('movement.amount', 'movementAmount')
      .where('schedule.userId = :userId', {userId})
      .andWhere('execution.status = :status', {
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
      })
      .andWhere(
        'COALESCE(execution.occurrenceDate, execution.contemplatedDate) BETWEEN :periodFrom AND :periodTo',
        {periodFrom, periodTo},
      )
      .andWhere('schedule.type IN (:...types)', {
        types: [
          ScheduledTransactionTypeEnum.INCOME.toString(),
          ScheduledTransactionTypeEnum.EXPENSE.toString(),
        ],
      })
      .getRawMany<AppliedCommitmentRaw>();

    return rows.map((row) => ({
      id: Number(row.executionId),
      type: (row.movementType ?? row.scheduleType) as MovementType,
      categoryId: Number(row.movementCategoryId ?? row.scheduleCategoryId),
      amount: Number(row.movementAmount ?? row.scheduleAmount),
    }));
  }

  /** Active income/expense schedules that may still have occurrences to project. */
  findPendingSchedules(userId: number): Promise<ScheduledCommitmentSchedule[]> {
    return this.dataSource.getRepository(ScheduledTransactionEntity).find({
      select: {
        id: true,
        estimatedAmount: true,
        type: true,
        categoryId: true,
        anchorDate: true,
        frequency: true,
        interval: true,
        nextContemplatedDate: true,
        nextExecutionDate: true,
        endDate: true,
        totalOccurrences: true,
        completedOccurrences: true,
      },
      where: {
        userId,
        deletedAt: IsNull(),
        active: true,
        type: In([
          ScheduledTransactionTypeEnum.INCOME.toString(),
          ScheduledTransactionTypeEnum.EXPENSE.toString(),
        ]),
      },
      order: {id: 'ASC'},
    });
  }
}

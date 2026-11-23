import {Injectable} from '@nestjs/common';
import type {CreateScheduledTransactionRequest} from '@peco/contracts';
import {MovementWriteStatusEnum, ScheduledTransactionTypeEnum} from '@peco/enums';
import {DataSource, IsNull, type EntityManager} from 'typeorm';
import {
  AccountEntity,
  CategoryEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';
import {movementCategoryAcceptsType} from '../../movements/utils/movement-category-accepts-type.util';
import type {ScheduledTransactionCreationResult} from '../types/scheduled-transaction-creation-result.type';
import {recurrenceDatesAt} from '../utils/recurrence-dates-at.util';

/** Owner-scoped schedule insert with the initial recurrence pair (10.2/8.11/US-601). */
@Injectable()
export class ScheduledTransactionCreationRepository {
  constructor(private readonly dataSource: DataSource) {}

  create(
    userId: number,
    request: CreateScheduledTransactionRequest,
  ): Promise<ScheduledTransactionCreationResult> {
    return this.dataSource.transaction('READ COMMITTED', (manager) =>
      this.insert(userId, request, manager),
    );
  }

  private async insert(
    userId: number,
    request: CreateScheduledTransactionRequest,
    manager: EntityManager,
  ): Promise<ScheduledTransactionCreationResult> {
    const source = await manager.findOne(AccountEntity, {
      where: {userId, publicId: request.sourceAccountPublicId, deletedAt: IsNull()},
    });
    if (!source) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    let destination: AccountEntity | null = null;
    if (request.type === ScheduledTransactionTypeEnum.TRANSFER.toString()) {
      if (!request.destinationAccountPublicId) {
        return {status: MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()};
      }
      if (request.destinationAccountPublicId === request.sourceAccountPublicId) {
        return {status: MovementWriteStatusEnum.SELF_TRANSFER.toString()};
      }

      destination = await manager.findOne(AccountEntity, {
        where: {userId, publicId: request.destinationAccountPublicId, deletedAt: IsNull()},
      });
      if (!destination) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }
    }

    const category = await manager.findOne(CategoryEntity, {
      where: [
        {publicId: request.categoryPublicId, userId: IsNull(), deletedAt: IsNull()},
        {publicId: request.categoryPublicId, userId, deletedAt: IsNull()},
      ],
    });
    if (!category) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    if (!movementCategoryAcceptsType(category.applyType, request.type)) {
      return {status: MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()};
    }

    const interval = request.interval ?? 1;
    const dates = recurrenceDatesAt(request.anchorDate, request.frequency, interval, 0);
    const schedule = await manager.save(
      manager.create(ScheduledTransactionEntity, {
        userId,
        name: request.name,
        estimatedAmount: request.estimatedAmount,
        type: request.type,
        categoryId: category.id,
        sourceAccountId: source.id,
        destinationAccountId: destination?.id ?? null,
        frequency: request.frequency,
        interval,
        anchorDate: request.anchorDate,
        nextContemplatedDate: dates.contemplatedDate,
        nextExecutionDate: dates.executionDate,
        autoApply: request.autoApply ?? false,
        active: true,
        totalOccurrences: request.totalOccurrences ?? null,
        completedOccurrences: 0,
        endDate: request.endDate ?? null,
        version: 0,
        deletedAt: null,
      }),
    );

    return {
      status: MovementWriteStatusEnum.CREATED.toString(),
      schedule,
      category,
      sourceAccount: source,
      destinationAccount: destination,
    };
  }
}

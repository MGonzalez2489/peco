import {Injectable} from '@nestjs/common';
import type {
  ApiErrorCode,
  CancelScheduledOccurrenceRequest,
  ExecuteScheduledTransactionRequest,
} from '@peco/contracts';
import {
  ApiErrorCodeEnum,
  MovementWriteStatusEnum,
  ScheduledExecutionReasonEnum,
  ScheduledExecutionStatusEnum,
} from '@peco/enums';
import {DataSource, IsNull, type EntityManager} from 'typeorm';
import {UtcClock} from '../../database/clock/utc-clock';
import {
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../../database/entities';
import {DEADLOCK_RETRY_LIMIT} from '../../movements/constants/deadlock-retry-limit.constant';
import {MovementCreationRepository} from '../../movements/services/movement-creation.repository';
import type {LedgerInsertRequest} from '../../movements/types/ledger-insert-request.type';
import {isDeadlockError} from '../../movements/utils/is-deadlock-error.util';
import {MAX_RECURRENCE_STEPS} from '../constants/max-recurrence-steps.constant';
import {MAX_SCHEDULED_EXECUTION_ATTEMPTS} from '../constants/max-scheduled-execution-attempts.constant';
import type {CancelScheduledOccurrenceResult} from '../types/cancel-scheduled-occurrence-result.type';
import type {ScheduledExecutionOptions} from '../types/scheduled-execution-options.type';
import type {ScheduledExecutionResult} from '../types/scheduled-execution-result.type';
import {recurrenceDatesAt} from '../utils/recurrence-dates-at.util';

/** Atomic single-occurrence execution with replay detection and grid advance (10.5/D21/US-604). */
@Injectable()
export class ScheduledExecutionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly creations: MovementCreationRepository,
    private readonly clock: UtcClock,
  ) {}

  async execute(
    userId: number,
    publicId: string,
    request: ExecuteScheduledTransactionRequest,
    asOf: string,
    options: ScheduledExecutionOptions = {},
  ): Promise<ScheduledExecutionResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction('READ COMMITTED', (manager) =>
          this.executeOnce(userId, publicId, request, asOf, manager, options),
        );
      } catch (error: unknown) {
        if (!isDeadlockError(error) || attempt >= DEADLOCK_RETRY_LIMIT) {
          throw error;
        }
      }
    }
  }

  /** Cancels the due occurrence with a balance-neutral row and advances the grid (10.7/US-605). */
  async cancel(
    userId: number,
    publicId: string,
    request: CancelScheduledOccurrenceRequest,
    asOf: string,
  ): Promise<CancelScheduledOccurrenceResult> {
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.dataSource.transaction('READ COMMITTED', (manager) =>
          this.cancelOnce(userId, publicId, request, asOf, manager),
        );
      } catch (error: unknown) {
        if (!isDeadlockError(error) || attempt >= DEADLOCK_RETRY_LIMIT) {
          throw error;
        }
      }
    }
  }

  private async cancelOnce(
    userId: number,
    publicId: string,
    request: CancelScheduledOccurrenceRequest,
    asOf: string,
    manager: EntityManager,
  ): Promise<CancelScheduledOccurrenceResult> {
    const user = await manager.findOne(UserEntity, {
      where: {id: userId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!user) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    const schedule = await manager.findOne(ScheduledTransactionEntity, {
      where: {userId, publicId, deletedAt: IsNull()},
      relations: {category: true, sourceAccount: true, destinationAccount: true},
      lock: {mode: 'pessimistic_write'},
    });
    if (!schedule) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    // Any stored execution for this slot means the grid was re-anchored or replayed (10.7/D21).
    const existing = await manager.findOne(ScheduledExecutionEntity, {
      where: {
        scheduledTransactionId: schedule.id,
        contemplatedDate: schedule.nextContemplatedDate,
      },
    });
    if (existing) {
      return {status: ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED.toString()};
    }
    if (!schedule.active) {
      return {status: ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString()};
    }
    if (schedule.nextExecutionDate > asOf) {
      return {status: ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString()};
    }

    const occurrenceDate = schedule.nextExecutionDate;
    const closed = await manager.findOne(PeriodSnapshotEntity, {
      where: {userId, period: occurrenceDate.slice(0, 7)},
    });
    if (closed) {
      return {status: ApiErrorCodeEnum.PERIOD_CLOSED.toString()};
    }

    const ledgerRequest: LedgerInsertRequest = {
      type: schedule.type,
      amount: schedule.estimatedAmount,
      date: `${occurrenceDate}T00:00:00.000Z`,
      note: request.note ?? schedule.name,
      accountPublicId: schedule.sourceAccount.publicId,
      categoryPublicId: schedule.category.publicId,
      targetAccountPublicId: schedule.destinationAccount?.publicId ?? undefined,
      scheduledTransactionId: schedule.id,
      isCanceled: true,
    };
    const ledger = await this.creations.insertWithManager(userId, ledgerRequest, manager);
    if (ledger.status === MovementWriteStatusEnum.PERIOD_CLOSED.toString()) {
      return {status: ApiErrorCodeEnum.PERIOD_CLOSED.toString()};
    }
    if (ledger.status !== MovementWriteStatusEnum.CREATED.toString()) {
      return {status: ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString()};
    }

    const occurrence = await this.saveExecution(manager, schedule, existing, {
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      occurrenceDate,
      movementId: ledger.movement.id,
      reason: ScheduledExecutionReasonEnum.USER_CANCELLED.toString(),
      attempts: 0,
    });
    const movement = await this.findMovement(manager, ledger.movement.id);
    if (!movement) {
      // Roll back the whole transaction instead of returning a failure after writing (US-605).
      throw new Error('Canceled movement not found after insert');
    }

    return {
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      occurrence,
      movement,
      schedule: await this.advance(manager, schedule),
    };
  }

  private async executeOnce(
    userId: number,
    publicId: string,
    request: ExecuteScheduledTransactionRequest,
    asOf: string,
    manager: EntityManager,
    options: ScheduledExecutionOptions,
  ): Promise<ScheduledExecutionResult> {
    // The user row is locked first, matching the ledger and period-closing paths (D60).
    const user = await manager.findOne(UserEntity, {
      where: {id: userId, deletedAt: IsNull()},
      lock: {mode: 'pessimistic_write'},
    });
    if (!user) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }

    // Locking the schedule serializes concurrent executions of the same occurrence (10.5).
    const schedule = await manager.findOne(ScheduledTransactionEntity, {
      where: {userId, publicId, deletedAt: IsNull()},
      relations: {category: true, sourceAccount: true, destinationAccount: true},
      lock: {mode: 'pessimistic_write'},
    });
    if (!schedule) {
      return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
    }
    const contemplatedDate = schedule.nextContemplatedDate;
    const occurrenceDate = schedule.nextExecutionDate;
    const existing = await manager.findOne(ScheduledExecutionEntity, {
      where: {scheduledTransactionId: schedule.id, contemplatedDate},
    });

    if (existing?.status === ScheduledExecutionStatusEnum.APPLIED.toString()) {
      const movement = existing.movementId
        ? await this.findMovement(manager, existing.movementId)
        : null;
      if (!movement) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }
      return {
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        replayed: true,
        occurrence: existing,
        movement,
        balances: [],
        schedule,
      };
    }
    if (existing?.status === ScheduledExecutionStatusEnum.SKIPPED.toString()) {
      return {
        status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
        replayed: true,
        occurrence: existing,
        balances: [],
        schedule,
      };
    }
    if (
      existing?.status === ScheduledExecutionStatusEnum.FAILED.toString() &&
      existing.attempts >= MAX_SCHEDULED_EXECUTION_ATTEMPTS
    ) {
      return {
        status: ScheduledExecutionStatusEnum.FAILED.toString(),
        occurrence: existing,
        reason: this.failureCode(existing.reason),
        schedule,
      };
    }

    // Replays are answered before due checks so a completed schedule can return its stored outcome (D21).
    if (!schedule.active) {
      return {status: ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString(), schedule};
    }
    if (schedule.nextExecutionDate > asOf) {
      return {status: ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString(), schedule};
    }

    const closed = await manager.findOne(PeriodSnapshotEntity, {
      where: {userId, period: occurrenceDate.slice(0, 7)},
    });
    if (closed) {
      return this.skipOccurrence(
        manager,
        schedule,
        existing,
        occurrenceDate,
        ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
      );
    }

    // D58 wins only for open periods; closed history keeps its more specific reason.
    if (options.inactiveBefore && occurrenceDate < options.inactiveBefore) {
      return this.skipOccurrence(
        manager,
        schedule,
        existing,
        occurrenceDate,
        ScheduledExecutionReasonEnum.INACTIVE_USER.toString(),
      );
    }

    const ledgerRequest: LedgerInsertRequest = {
      type: schedule.type,
      amount: request.actualAmount ?? schedule.estimatedAmount,
      date: `${occurrenceDate}T00:00:00.000Z`,
      note: schedule.name,
      accountPublicId: schedule.sourceAccount.publicId,
      categoryPublicId: schedule.category.publicId,
      targetAccountPublicId: schedule.destinationAccount?.publicId ?? undefined,
      scheduledTransactionId: schedule.id,
    };
    const ledger = await this.creations.insertWithManager(userId, ledgerRequest, manager);

    if (ledger.status === MovementWriteStatusEnum.CREATED.toString()) {
      const occurrence = await this.saveExecution(manager, schedule, existing, {
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        occurrenceDate,
        movementId: ledger.movement.id,
        reason: null,
        attempts: existing?.attempts ?? 0,
      });
      const movement = await this.findMovement(manager, ledger.movement.id);
      if (!movement) {
        return {status: MovementWriteStatusEnum.NOT_FOUND.toString()};
      }
      return {
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        replayed: false,
        occurrence,
        movement,
        balances: ledger.balances,
        schedule: await this.advance(manager, schedule),
      };
    }

    if (ledger.status === MovementWriteStatusEnum.PERIOD_CLOSED.toString()) {
      return this.skipOccurrence(
        manager,
        schedule,
        existing,
        occurrenceDate,
        ApiErrorCodeEnum.PERIOD_CLOSED.toString(),
      );
    }

    const reason = this.failureCodeFromLedger(ledger.status);
    const occurrence = await this.saveExecution(manager, schedule, existing, {
      status: ScheduledExecutionStatusEnum.FAILED.toString(),
      occurrenceDate,
      movementId: null,
      reason,
      attempts: (existing?.attempts ?? 0) + 1,
    });
    return {
      status: ScheduledExecutionStatusEnum.FAILED.toString(),
      occurrence,
      reason,
      schedule,
    };
  }

  private async skipOccurrence(
    manager: EntityManager,
    schedule: ScheduledTransactionEntity,
    existing: ScheduledExecutionEntity | null,
    occurrenceDate: string,
    reason: string,
  ): Promise<ScheduledExecutionResult> {
    const occurrence = await this.saveExecution(manager, schedule, existing, {
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      occurrenceDate,
      movementId: null,
      reason,
      attempts: existing?.attempts ?? 0,
    });
    return {
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      replayed: false,
      occurrence,
      balances: [],
      schedule: await this.advance(manager, schedule),
    };
  }

  private saveExecution(
    manager: EntityManager,
    schedule: ScheduledTransactionEntity,
    existing: ScheduledExecutionEntity | null,
    values: Pick<
      ScheduledExecutionEntity,
      'status' | 'occurrenceDate' | 'movementId' | 'reason' | 'attempts'
    >,
  ): Promise<ScheduledExecutionEntity> {
    const execution =
      existing ??
      manager.create(ScheduledExecutionEntity, {
        scheduledTransactionId: schedule.id,
        contemplatedDate: schedule.nextContemplatedDate,
        createdAt: this.clock.now(),
      });

    Object.assign(execution, values);
    return manager.save(execution);
  }

  private async advance(
    manager: EntityManager,
    schedule: ScheduledTransactionEntity,
  ): Promise<ScheduledTransactionEntity> {
    const dates = this.nextDates(schedule);
    const completedOccurrences = schedule.completedOccurrences + 1;
    const finishedByCap =
      schedule.totalOccurrences !== null && completedOccurrences >= schedule.totalOccurrences;
    const finishedByEndDate =
      schedule.endDate !== null && dates.contemplatedDate > schedule.endDate;

    schedule.completedOccurrences = completedOccurrences;
    schedule.nextContemplatedDate = dates.contemplatedDate;
    schedule.nextExecutionDate = dates.executionDate;
    schedule.active = finishedByCap || finishedByEndDate ? false : schedule.active;
    schedule.version += 1;
    schedule.updatedAt = this.clock.now();
    return manager.save(schedule);
  }

  private nextDates(
    schedule: ScheduledTransactionEntity,
  ): {contemplatedDate: string; executionDate: string} {
    for (let step = 0; step < MAX_RECURRENCE_STEPS; step += 1) {
      const dates = recurrenceDatesAt(
        schedule.anchorDate,
        schedule.frequency,
        schedule.interval,
        step,
      );
      if (dates.contemplatedDate > schedule.nextContemplatedDate) {
        return dates;
      }
    }
    throw new Error('Scheduled transaction grid exhausted');
  }

  private findMovement(
    manager: EntityManager,
    id: number,
  ): Promise<MovementEntity | null> {
    return manager.findOne(MovementEntity, {
      where: {id},
      relations: {
        account: true,
        targetAccount: true,
        category: true,
        reversalOf: true,
        replacesMovement: true,
        scheduledTransaction: true,
      },
    });
  }

  private failureCodeFromLedger(status: string): ApiErrorCode {
    if (status === MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()) {
      return ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString();
    }
    if (status === MovementWriteStatusEnum.PERIOD_CLOSED.toString()) {
      return ApiErrorCodeEnum.PERIOD_CLOSED.toString();
    }
    if (status === MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()) {
      return ApiErrorCodeEnum.CATEGORY_NOT_COMPATIBLE.toString();
    }
    if (
      status === MovementWriteStatusEnum.SELF_TRANSFER.toString() ||
      status === MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()
    ) {
      return ApiErrorCodeEnum.TRANSFER_REQUIRED.toString();
    }
    return ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString();
  }

  private failureCode(reason: string | null): ApiErrorCode {
    if (reason === ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString()) {
      return ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString();
    }
    if (reason === ApiErrorCodeEnum.PERIOD_CLOSED.toString()) {
      return ApiErrorCodeEnum.PERIOD_CLOSED.toString();
    }
    if (reason === ApiErrorCodeEnum.CATEGORY_NOT_COMPATIBLE.toString()) {
      return ApiErrorCodeEnum.CATEGORY_NOT_COMPATIBLE.toString();
    }
    if (reason === ApiErrorCodeEnum.TRANSFER_REQUIRED.toString()) {
      return ApiErrorCodeEnum.TRANSFER_REQUIRED.toString();
    }
    return ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString();
  }
}

import {HttpStatus, Injectable} from '@nestjs/common';
import type {
  ApiErrorCode,
  CancelScheduledOccurrenceRequest,
  CreateScheduledTransactionRequest,
  ExecuteScheduledTransactionRequest,
  ListScheduledTransactionsQuery,
  ScheduledTransactionResponse,
  ToggleScheduledTransactionRequest,
  UpdateScheduledTransactionRequest,
} from '@peco/contracts';
import {
  ApiErrorCodeEnum,
  MovementWriteStatusEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {negativeBalanceConflictException} from '../accounts/utils/negative-balance-conflict.exception';
import {periodClosedException} from '../accounts/utils/period-closed.exception';
import {selfTransferException} from '../accounts/utils/self-transfer.exception';
import {transferRequiredException} from '../accounts/utils/transfer-required.exception';
import {versionConflictException} from '../accounts/utils/version-conflict.exception';
import {API_ERROR_MESSAGES} from '../common/http/api-error-messages.constant';
import {ApiException} from '../common/http/api-exception';
import {VALIDATION_FIELD_MESSAGES} from '../common/validation/validation-field-messages.constant';
import {UtcClock} from '../database/clock/utc-clock';
import type {ScheduledTransactionEntity} from '../database/entities';
import {categoryNotCompatibleException} from '../movements/utils/category-not-compatible.exception';
import {periodUtcBounds} from '../movements/utils/period-utc-bounds.util';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {MAX_RECURRENCE_STEPS} from './constants/max-recurrence-steps.constant';
import {CancelScheduledOccurrenceResponseDto} from './dto/cancel-scheduled-occurrence-response.dto';
import {ExecuteScheduledTransactionResponseDto} from './dto/execute-scheduled-transaction-response.dto';
import {ScheduledTransactionResponseDto} from './dto/scheduled-transaction-response.dto';
import {ScheduledExecutionRepository} from './services/scheduled-execution.repository';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';
import type {ScheduledTransactionActiveValues} from './types/scheduled-transaction-active-values.type';
import type {ScheduledTransactionListFilter} from './types/scheduled-transaction-list-filter.type';
import type {ScheduledTransactionUpdateValues} from './types/scheduled-transaction-update-values.type';
import {movementCategoryAcceptsType} from '../movements/utils/movement-category-accepts-type.util';
import {occurrenceAlreadyProcessedException} from './utils/occurrence-already-processed.exception';
import {scheduleValidationException} from './utils/schedule-validation.exception';
import {scheduledTransactionResourceNotFoundException} from './utils/scheduled-transaction-resource-not-found.exception';
import {recurrenceDatesAt} from './utils/recurrence-dates-at.util';
import {scheduleInactiveException} from './utils/schedule-inactive.exception';
import {scheduleNotDueException} from './utils/schedule-not-due.exception';

/** Authenticated schedule creation, reads, edits, toggles and single-occurrence execution (8.11/10.5). */
@Injectable()
export class ScheduledTransactionsService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly creations: ScheduledTransactionCreationRepository,
    private readonly queries: ScheduledTransactionQueryRepository,
    private readonly updates: ScheduledTransactionUpdateRepository,
    private readonly executions: ScheduledExecutionRepository,
    private readonly clock: UtcClock,
  ) {}

  async create(
    publicId: string,
    request: CreateScheduledTransactionRequest,
  ): Promise<ScheduledTransactionResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const result = await this.creations.create(user.id, request);

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (result.status === MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()) {
      throw transferRequiredException();
    }
    if (result.status === MovementWriteStatusEnum.SELF_TRANSFER.toString()) {
      throw selfTransferException();
    }
    if (result.status === MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()) {
      throw categoryNotCompatibleException();
    }

    return new ScheduledTransactionResponseDto(result.schedule, {
      category: result.category,
      sourceAccount: result.sourceAccount,
      destinationAccount: result.destinationAccount,
    });
  }

  async list(
    publicId: string,
    query: ListScheduledTransactionsQuery,
  ): Promise<{items: ScheduledTransactionResponseDto[]; nextCursor: string | null}> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const page = await this.queries.list(
      this.toFilter(user.id, query),
      query.cursor,
      query.limit,
    );

    return {
      items: page.items.map((schedule) => ScheduledTransactionResponseDto.fromEntity(schedule)),
      nextCursor: page.nextCursor,
    };
  }

  async findOne(
    publicId: string,
    schedulePublicId: string,
  ): Promise<ScheduledTransactionResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const schedule = await this.queries.findOwnerDetail(user.id, schedulePublicId);
    if (!schedule) {
      throw scheduledTransactionResourceNotFoundException();
    }

    return ScheduledTransactionResponseDto.fromEntity(schedule);
  }

  async update(
    publicId: string,
    schedulePublicId: string,
    request: UpdateScheduledTransactionRequest,
  ): Promise<ScheduledTransactionResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const schedule = await this.queries.findOwnerDetail(user.id, schedulePublicId);
    if (!schedule) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (request.version !== undefined && schedule.version !== request.version) {
      throw versionConflictException(request.version, schedule.version);
    }

    const type = (request.type ?? schedule.type) as ScheduledTransactionResponse['type'];
    const name = request.name ?? schedule.name;
    const estimatedAmount = request.estimatedAmount ?? schedule.estimatedAmount;
    const categoryPublicId = request.categoryPublicId ?? schedule.category.publicId;
    const sourcePublicId = request.sourceAccountPublicId ?? schedule.sourceAccount.publicId;
    const destinationPublicId =
      type === ScheduledTransactionTypeEnum.TRANSFER.toString()
        ? request.destinationAccountPublicId !== undefined
          ? request.destinationAccountPublicId
          : schedule.destinationAccount?.publicId ?? null
        : null;
    const frequency = request.frequency ?? schedule.frequency;
    const interval = request.interval ?? schedule.interval;
    const anchorDate = request.anchorDate ?? schedule.anchorDate;
    const autoApply = request.autoApply ?? schedule.autoApply;
    const totalOccurrences =
      request.totalOccurrences !== undefined
        ? request.totalOccurrences
        : schedule.totalOccurrences;
    const endDate = request.endDate !== undefined ? request.endDate : schedule.endDate;

    if (endDate !== null && endDate < anchorDate) {
      throw scheduleValidationException(
        'endDate',
        VALIDATION_FIELD_MESSAGES.endDateNotBeforeAnchor,
      );
    }
    if (type === ScheduledTransactionTypeEnum.TRANSFER.toString() && !destinationPublicId) {
      throw transferRequiredException();
    }

    const source = await this.queries.findActiveAccount(user.id, sourcePublicId);
    if (!source) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (
      type === ScheduledTransactionTypeEnum.TRANSFER.toString() &&
      destinationPublicId === sourcePublicId
    ) {
      throw selfTransferException();
    }
    const destination =
      type === ScheduledTransactionTypeEnum.TRANSFER.toString() && destinationPublicId
        ? await this.queries.findActiveAccount(user.id, destinationPublicId)
        : null;
    if (type === ScheduledTransactionTypeEnum.TRANSFER.toString() && !destination) {
      throw scheduledTransactionResourceNotFoundException();
    }

    const category = await this.queries.findVisibleCategory(user.id, categoryPublicId);
    if (!category) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (!movementCategoryAcceptsType(category.applyType, type)) {
      throw categoryNotCompatibleException();
    }

    const gridChanged =
      request.anchorDate !== undefined ||
      request.frequency !== undefined ||
      request.interval !== undefined;
    let nextContemplatedDate = schedule.nextContemplatedDate;
    let nextExecutionDate = schedule.nextExecutionDate;

    if (gridChanged) {
      const lastProcessed = await this.queries.lastProcessedContemplatedDate(schedule.id);
      let step = 0;
      while (
        step < MAX_RECURRENCE_STEPS &&
        recurrenceDatesAt(anchorDate, frequency, interval, step).contemplatedDate <=
          (lastProcessed ?? '')
      ) {
        step += 1;
      }
      if (step >= MAX_RECURRENCE_STEPS) {
        throw scheduleValidationException(
          'anchorDate',
          VALIDATION_FIELD_MESSAGES.scheduleGridUnavailable,
        );
      }

      const dates = recurrenceDatesAt(anchorDate, frequency, interval, step);
      if (await this.queries.hasExecutionAt(schedule.id, dates.contemplatedDate)) {
        throw occurrenceAlreadyProcessedException();
      }
      nextContemplatedDate = dates.contemplatedDate;
      nextExecutionDate = dates.executionDate;
    }

    let active = schedule.active;
    if (gridChanged || request.totalOccurrences !== undefined || request.endDate !== undefined) {
      const finishedByCap =
        totalOccurrences !== null && totalOccurrences <= schedule.completedOccurrences;
      const finishedByEndDate = endDate !== null && nextContemplatedDate > endDate;
      if (finishedByCap || finishedByEndDate) {
        active = false;
      }
    }

    const values: ScheduledTransactionUpdateValues = {
      name,
      estimatedAmount,
      type,
      categoryId: category.id,
      sourceAccountId: source.id,
      destinationAccountId: destination?.id ?? null,
      frequency,
      interval,
      anchorDate,
      nextContemplatedDate,
      nextExecutionDate,
      autoApply,
      active,
      totalOccurrences,
      endDate,
    };
    const result = await this.updates.update(user.id, schedulePublicId, request, values);

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (result.status === MovementWriteStatusEnum.CONFLICT.toString()) {
      throw versionConflictException(request.version ?? result.currentVersion, result.currentVersion);
    }

    return ScheduledTransactionResponseDto.fromEntity(result.schedule);
  }

  /** Sets `active` explicitly; resume skips paused time instead of back-billing it (10.8/US-603). */
  async toggle(
    publicId: string,
    schedulePublicId: string,
    request: ToggleScheduledTransactionRequest,
  ): Promise<ScheduledTransactionResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const schedule = await this.queries.findOwnerDetail(user.id, schedulePublicId);
    if (!schedule) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (request.version !== undefined && schedule.version !== request.version) {
      throw versionConflictException(request.version, schedule.version);
    }

    let active = request.active;
    let nextContemplatedDate = schedule.nextContemplatedDate;
    let nextExecutionDate = schedule.nextExecutionDate;

    if (request.active && !this.hasReachedStopCondition(schedule)) {
      const resumeDates = await this.firstResumableDates(schedule);
      if (schedule.endDate !== null && resumeDates.contemplatedDate > schedule.endDate) {
        active = false;
      } else {
        nextContemplatedDate = resumeDates.contemplatedDate;
        nextExecutionDate = resumeDates.executionDate;
      }
    } else if (request.active) {
      active = false;
    }

    const values: ScheduledTransactionActiveValues = {
      active,
      nextContemplatedDate,
      nextExecutionDate,
    };
    const result = await this.updates.setActive(
      user.id,
      schedulePublicId,
      request.version,
      values,
    );

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (result.status === MovementWriteStatusEnum.CONFLICT.toString()) {
      throw versionConflictException(request.version ?? result.currentVersion, result.currentVersion);
    }

    return ScheduledTransactionResponseDto.fromEntity(result.schedule);
  }

  /** Applies exactly one due occurrence and maps replay, skip and failure outcomes (10.5/US-604). */
  async execute(
    publicId: string,
    schedulePublicId: string,
    request: ExecuteScheduledTransactionRequest,
  ): Promise<ExecuteScheduledTransactionResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const schedule = await this.queries.findOwnerDetail(user.id, schedulePublicId);
    if (!schedule) {
      throw scheduledTransactionResourceNotFoundException();
    }

    const asOf = this.clock.now().slice(0, 10);
    const result = await this.executions.execute(user.id, schedulePublicId, request, asOf);

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (result.status === ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString()) {
      throw scheduleInactiveException();
    }
    if (result.status === ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString()) {
      throw scheduleNotDueException();
    }
    if (result.status === ScheduledExecutionStatusEnum.FAILED.toString()) {
      throw this.failureException(result.reason);
    }

    return new ExecuteScheduledTransactionResponseDto(
      result.occurrence,
      'movement' in result ? result.movement : null,
      result.schedule,
      result.balances,
    );
  }

  /** Cancels one due occurrence without changing balances and maps stable conflicts (10.7/US-605). */
  async cancel(
    publicId: string,
    schedulePublicId: string,
    request: CancelScheduledOccurrenceRequest,
  ): Promise<CancelScheduledOccurrenceResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const schedule = await this.queries.findOwnerDetail(user.id, schedulePublicId);
    if (!schedule) {
      throw scheduledTransactionResourceNotFoundException();
    }

    const asOf = this.clock.now().slice(0, 10);
    const result = await this.executions.cancel(user.id, schedulePublicId, request, asOf);

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (result.status === ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString()) {
      throw scheduleInactiveException();
    }
    if (result.status === ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString()) {
      throw scheduleNotDueException();
    }
    if (result.status === ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED.toString()) {
      throw occurrenceAlreadyProcessedException();
    }
    if (result.status === ApiErrorCodeEnum.PERIOD_CLOSED.toString()) {
      throw periodClosedException();
    }
    if (result.status === ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString()) {
      throw new ApiException(
        HttpStatus.UNPROCESSABLE_ENTITY,
        ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString(),
        API_ERROR_MESSAGES.UNPROCESSABLE_ENTITY,
      );
    }

    return new CancelScheduledOccurrenceResponseDto(
      result.occurrence,
      result.movement,
      result.schedule,
    );
  }

  private failureException(reason: ApiErrorCode): ApiException {
    if (reason === ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString()) {
      return negativeBalanceConflictException();
    }
    if (reason === ApiErrorCodeEnum.PERIOD_CLOSED.toString()) {
      return periodClosedException();
    }
    return new ApiException(HttpStatus.CONFLICT, reason, API_ERROR_MESSAGES[reason]);
  }

  private hasReachedStopCondition(schedule: ScheduledTransactionEntity): boolean {
    return (
      schedule.totalOccurrences !== null &&
      schedule.totalOccurrences <= schedule.completedOccurrences
    );
  }

  /** First grid point after the processed history whose applied date is not in the past. */
  private async firstResumableDates(
    schedule: ScheduledTransactionEntity,
  ): Promise<{contemplatedDate: string; executionDate: string}> {
    const lastProcessed = await this.queries.lastProcessedContemplatedDate(schedule.id);
    const today = this.clock.now().slice(0, 10);
    const processedThrough = lastProcessed ?? '';

    for (let step = 0; step < MAX_RECURRENCE_STEPS; step += 1) {
      const dates = recurrenceDatesAt(
        schedule.anchorDate,
        schedule.frequency,
        schedule.interval,
        step,
      );
      if (dates.contemplatedDate > processedThrough && dates.executionDate >= today) {
        return dates;
      }
    }

    throw scheduleValidationException(
      'anchorDate',
      VALIDATION_FIELD_MESSAGES.scheduleGridUnavailable,
    );
  }

  private toFilter(
    userId: number,
    query: ListScheduledTransactionsQuery,
  ): ScheduledTransactionListFilter {
    const currentPeriod = this.clock.now().slice(0, 7);
    const period = query.period ?? currentPeriod;
    const bounds = periodUtcBounds(period);

    return {
      userId,
      periodFrom: bounds.from.slice(0, 10),
      periodTo: bounds.to.slice(0, 10),
      periodPosition:
        period === currentPeriod ? 'current' : period < currentPeriod ? 'past' : 'future',
      type: query.type,
      active: query.active,
      autoApply: query.autoApply,
      accountPublicId: query.accountPublicId?.trim() || undefined,
      search: query.search?.trim() || undefined,
    };
  }
}

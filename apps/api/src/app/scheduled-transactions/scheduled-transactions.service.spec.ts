import {
  ApiErrorCodeEnum,
  CategoryApplyTypeEnum,
  MovementWriteStatusEnum,
  ScheduledExecutionReasonEnum,
  ScheduledExecutionStatusEnum,
} from '@peco/enums';
import type {
  MovementEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
} from '../database/entities';
import type {AppConfig} from '../config/app-config';
import {ConfigService} from '../config/config.service';
import {UtcClock} from '../database/clock/utc-clock';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledExecutionRepository} from './services/scheduled-execution.repository';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';

const NOW = '2026-11-23T12:00:00.000Z';

const makeSchedule = (overrides: Partial<ScheduledTransactionEntity> = {}) =>
  ({
    id: 1,
    publicId: 'schedule-public-id',
    name: 'Renta',
    estimatedAmount: 800000,
    type: 'EXPENSE',
    frequency: 'MONTHLY',
    interval: 1,
    anchorDate: '2020-01-15',
    nextContemplatedDate: '2020-01-15',
    nextExecutionDate: '2020-01-15',
    autoApply: true,
    active: true,
    totalOccurrences: 12,
    completedOccurrences: 0,
    endDate: null,
    version: 0,
    createdAt: NOW,
    updatedAt: NOW,
    category: {publicId: 'category-public-id'},
    sourceAccount: {publicId: 'source-account-public-id'},
    destinationAccount: null,
    ...overrides,
  }) as unknown as ScheduledTransactionEntity;

const makeMovement = (overrides: Partial<MovementEntity> = {}) =>
  ({
    publicId: 'canceled-movement-public-id',
    type: 'EXPENSE',
    amount: 800000,
    date: '2020-01-15T00:00:00.000Z',
    note: 'Cancelada por el usuario',
    account: {publicId: 'source-account-public-id', name: 'Débito', type: 'DEBIT'},
    targetAccount: null,
    category: {
      publicId: 'category-public-id',
      name: 'renta',
      displayName: 'Servicios',
      applyType: 'EXPENSE',
    },
    isReversal: false,
    isReversed: false,
    reversalOf: null,
    replacesMovement: null,
    isCanceled: true,
    scheduledTransaction: {publicId: 'schedule-public-id'},
    version: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }) as unknown as MovementEntity;

describe('ScheduledTransactionsService (US-602–US-608)', () => {
  const setup = (
    overrides: Partial<ScheduledTransactionEntity> = {},
    configOverrides: Partial<AppConfig['operational']> = {},
  ) => {
    const schedule = makeSchedule(overrides);
    const profile = {
      findActiveByPublicId: jest.fn().mockResolvedValue({id: 1}),
    } as unknown as UserProfileRepository;
    const creations = {} as ScheduledTransactionCreationRepository;
    const queries = {
      findOwnerDetail: jest.fn().mockResolvedValue(schedule),
      lastProcessedContemplatedDate: jest.fn().mockResolvedValue(null),
      hasExecutionAt: jest.fn().mockResolvedValue(false),
      findActiveAccount: jest.fn().mockResolvedValue({id: 1, publicId: 'source-account-public-id'}),
      findVisibleCategory: jest.fn().mockResolvedValue({
        id: 1,
        publicId: 'category-public-id',
        applyType: CategoryApplyTypeEnum.BOTH.toString(),
      }),
      list: jest.fn(),
      findDue: jest.fn().mockResolvedValue([]),
    } as unknown as ScheduledTransactionQueryRepository;
    const updates = {
      update: jest.fn().mockResolvedValue({status: 'UPDATED', schedule}),
      setActive: jest.fn().mockResolvedValue({status: 'UPDATED', schedule}),
      softDelete: jest.fn().mockResolvedValue({status: MovementWriteStatusEnum.DELETED.toString()}),
    } as unknown as ScheduledTransactionUpdateRepository;
    const executions = {
      execute: jest.fn().mockResolvedValue({
        status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
        replayed: false,
        occurrence: {contemplatedDate: '2020-01-15', occurrenceDate: '2020-01-15', reason: null},
        balances: [],
        schedule,
      }),
      cancel: jest.fn().mockResolvedValue({
        status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
        occurrence: {
          contemplatedDate: '2020-01-15',
          occurrenceDate: '2020-01-15',
          status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
          reason: 'USER_CANCELLED',
        },
        movement: makeMovement(),
        schedule,
      }),
    } as unknown as ScheduledExecutionRepository;
    const clock = new UtcClock();
    jest.spyOn(clock, 'now').mockReturnValue(NOW);
    const config = new ConfigService({
      operational: {
        catchupBatchSize: 500,
        inactiveGraceDays: 7,
        inactiveUserDays: 90,
        ...configOverrides,
      },
    } as AppConfig);
    const service = new ScheduledTransactionsService(
      profile,
      creations,
      queries,
      updates,
      executions,
      clock,
      config,
    );

    return {queries, updates, executions, service, schedule};
  };

  it('rejects a re-anchor whose computed slot already has an execution row', async () => {
    const {queries, service} = setup();
    jest.spyOn(queries, 'hasExecutionAt').mockResolvedValue(true);

    await expect(
      service.update('user-public-id', 'schedule-public-id', {anchorDate: '2020-01-15'}),
    ).rejects.toMatchObject({status: 409, code: 'OCCURRENCE_ALREADY_PROCESSED'});
  });

  it('compares endDate with the stored anchor when the body omits anchorDate', async () => {
    const {service} = setup();

    await expect(
      service.update('user-public-id', 'schedule-public-id', {endDate: '2019-12-31'}),
    ).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: {fields: {endDate: expect.any(String)}},
    });
  });

  it('pauses without touching the next dates or querying processed history', async () => {
    const {queries, updates, service} = setup();

    await service.toggle('user-public-id', 'schedule-public-id', {active: false, version: 0});

    expect(queries.lastProcessedContemplatedDate).not.toHaveBeenCalled();
    expect(updates.setActive).toHaveBeenCalledWith(1, 'schedule-public-id', 0, {
      active: false,
      nextContemplatedDate: '2020-01-15',
      nextExecutionDate: '2020-01-15',
    });
  });

  it('resumes at the first applied date not in the past when no occurrence was processed', async () => {
    const {updates, service} = setup({active: false, totalOccurrences: null});

    await service.toggle('user-public-id', 'schedule-public-id', {active: true});

    expect(updates.setActive).toHaveBeenCalledWith(1, 'schedule-public-id', undefined, {
      active: true,
      nextContemplatedDate: '2026-12-15',
      nextExecutionDate: '2026-12-15',
    });
  });

  it('skips processed grid points when resuming', async () => {
    const {queries, updates, service} = setup({active: false, totalOccurrences: null});
    jest.spyOn(queries, 'lastProcessedContemplatedDate').mockResolvedValue('2026-11-15');

    await service.toggle('user-public-id', 'schedule-public-id', {active: true});

    expect(updates.setActive).toHaveBeenCalledWith(1, 'schedule-public-id', undefined, {
      active: true,
      nextContemplatedDate: '2026-12-15',
      nextExecutionDate: '2026-12-15',
    });
  });

  it('keeps the schedule finished when the occurrence cap was already reached', async () => {
    const {queries, updates, service} = setup({
      active: false,
      totalOccurrences: 1,
      completedOccurrences: 1,
    });

    await service.toggle('user-public-id', 'schedule-public-id', {active: true});

    expect(queries.lastProcessedContemplatedDate).not.toHaveBeenCalled();
    expect(updates.setActive).toHaveBeenCalledWith(1, 'schedule-public-id', undefined, {
      active: false,
      nextContemplatedDate: '2020-01-15',
      nextExecutionDate: '2020-01-15',
    });
  });

  it('does not resume past the endDate', async () => {
    const {updates, service} = setup({
      active: false,
      totalOccurrences: null,
      endDate: '2026-11-01',
    });

    await service.toggle('user-public-id', 'schedule-public-id', {active: true});

    expect(updates.setActive).toHaveBeenCalledWith(1, 'schedule-public-id', undefined, {
      active: false,
      nextContemplatedDate: '2020-01-15',
      nextExecutionDate: '2020-01-15',
    });
  });

  it('rejects a stale version before computing resume dates', async () => {
    const {queries, updates, service} = setup();

    await expect(
      service.toggle('user-public-id', 'schedule-public-id', {active: false, version: 1}),
    ).rejects.toMatchObject({status: 409, code: 'VERSION_CONFLICT'});
    expect(queries.lastProcessedContemplatedDate).not.toHaveBeenCalled();
    expect(updates.setActive).not.toHaveBeenCalled();
  });

  it('maps a compare-and-set conflict from the repository', async () => {
    const {updates, service} = setup();
    jest
      .spyOn(updates, 'setActive')
      .mockResolvedValueOnce({
        status: MovementWriteStatusEnum.CONFLICT.toString(),
        currentVersion: 2,
      });

    await expect(
      service.toggle('user-public-id', 'schedule-public-id', {active: false, version: 0}),
    ).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      details: {expectedVersion: 0, currentVersion: 2},
    });
  });

  it('maps an inactive schedule from the executor to the stable conflict', async () => {
    const {executions, service, schedule} = setup({active: false});
    jest.spyOn(executions, 'execute').mockResolvedValueOnce({
      status: ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString(),
      schedule,
    });

    await expect(
      service.execute('user-public-id', 'schedule-public-id', {}),
    ).rejects.toMatchObject({status: 409, code: 'SCHEDULE_INACTIVE'});
  });

  it('maps a future applied date from the executor to the stable conflict', async () => {
    const {executions, service, schedule} = setup({nextExecutionDate: '2026-11-24'});
    jest.spyOn(executions, 'execute').mockResolvedValueOnce({
      status: ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString(),
      schedule,
    });

    await expect(
      service.execute('user-public-id', 'schedule-public-id', {}),
    ).rejects.toMatchObject({status: 409, code: 'SCHEDULE_NOT_DUE'});
  });

  it('maps a failed execution to the stable negative-balance conflict', async () => {
    const {executions, service, schedule} = setup();
    jest.spyOn(executions, 'execute').mockResolvedValueOnce({
      status: ScheduledExecutionStatusEnum.FAILED.toString(),
      occurrence: {
        contemplatedDate: '2020-01-15',
        occurrenceDate: '2020-01-15',
        reason: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
      } as unknown as ScheduledExecutionEntity,
      reason: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
      schedule,
    });

    await expect(
      service.execute('user-public-id', 'schedule-public-id', {}),
    ).rejects.toMatchObject({status: 409, code: 'NEGATIVE_BALANCE_NOT_ALLOWED'});
  });

  it('passes the UTC date and the one-off amount to the executor', async () => {
    const {executions, service, schedule} = setup();
    const movement = {
      publicId: 'movement-public-id',
      type: 'EXPENSE',
      amount: 75000,
      date: '2020-01-15T00:00:00.000Z',
      note: 'Renta',
      account: {publicId: 'source-account-public-id', name: 'Débito', type: 'DEBIT'},
      targetAccount: null,
      category: {
        publicId: 'category-public-id',
        name: 'renta',
        displayName: 'Servicios',
        applyType: 'EXPENSE',
      },
      isReversal: false,
      isReversed: false,
      reversalOfPublicId: null,
      replacesPublicId: null,
      isCanceled: false,
      scheduledTransactionPublicId: 'schedule-public-id',
      version: 0,
      createdAt: NOW,
      updatedAt: NOW,
    } as unknown as MovementEntity;
    jest.spyOn(executions, 'execute').mockResolvedValueOnce({
      status: ScheduledExecutionStatusEnum.APPLIED.toString(),
      replayed: false,
      occurrence: {
        contemplatedDate: '2020-01-15',
        occurrenceDate: '2020-01-15',
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        reason: null,
      } as unknown as ScheduledExecutionEntity,
      movement,
      balances: [],
      schedule,
    });

    const response = await service.execute('user-public-id', 'schedule-public-id', {
      actualAmount: 75000,
    });

    expect(executions.execute).toHaveBeenCalledWith(
      1,
      'schedule-public-id',
      {actualAmount: 75000},
      '2026-11-23',
    );
    expect(response.movement?.amount).toBe(75000);
  });

  it('passes the UTC date and note to the cancellation repository', async () => {
    const {executions, service} = setup();

    const response = await service.cancel('user-public-id', 'schedule-public-id', {
      note: 'Cancelada por el usuario',
    });

    expect(executions.cancel).toHaveBeenCalledWith(
      1,
      'schedule-public-id',
      {note: 'Cancelada por el usuario'},
      '2026-11-23',
    );
    expect(response.movement.isCanceled).toBe(true);
    expect(response.occurrence.reason).toBe(
      ScheduledExecutionReasonEnum.USER_CANCELLED.toString(),
    );
  });

  it.each([
    ['inactive', ApiErrorCodeEnum.SCHEDULE_INACTIVE.toString(), 'SCHEDULE_INACTIVE'],
    ['not due', ApiErrorCodeEnum.SCHEDULE_NOT_DUE.toString(), 'SCHEDULE_NOT_DUE'],
    [
      'already processed',
      ApiErrorCodeEnum.OCCURRENCE_ALREADY_PROCESSED.toString(),
      'OCCURRENCE_ALREADY_PROCESSED',
    ],
    ['closed period', ApiErrorCodeEnum.PERIOD_CLOSED.toString(), 'PERIOD_CLOSED'],
  ])('maps a %s cancellation to its stable conflict', async (_label, status, code) => {
    const {executions, service, schedule} = setup();
    jest.spyOn(executions, 'cancel').mockResolvedValueOnce({status, schedule} as never);

    await expect(
      service.cancel('user-public-id', 'schedule-public-id', {}),
    ).rejects.toMatchObject({status: 409, code});
  });

  it('previews due schedules and counts pending occurrences without executing them', async () => {
    const {queries, executions, service, schedule} = setup({
      nextContemplatedDate: '2026-01-15',
      nextExecutionDate: '2026-01-15',
      totalOccurrences: null,
    });
    jest.spyOn(queries, 'findDue').mockResolvedValueOnce([schedule]);

    const result = await service.findDue(
      'user-public-id',
      {asOf: '2026-11-23', autoApply: false},
      null,
    );

    expect(queries.findDue).toHaveBeenCalledWith(1, '2026-11-23', false);
    expect(result.items).toHaveLength(1);
    expect(result.pendingOccurrences).toBe(11);
    expect(result.skippedWhileInactive).toBe(0);
    expect(executions.execute).not.toHaveBeenCalled();
  });

  it('applies due occurrences oldest first and returns the per-schedule summary', async () => {
    const {queries, executions, service} = setup({
      nextContemplatedDate: '2026-01-15',
      nextExecutionDate: '2026-01-15',
      totalOccurrences: null,
    });
    jest.spyOn(queries, 'findDue').mockResolvedValueOnce([makeSchedule({
      nextContemplatedDate: '2026-01-15',
      nextExecutionDate: '2026-01-15',
      totalOccurrences: null,
    })]);

    const outcome = (occurrenceDate: string, nextDate: string, completed: number) => ({
      status: ScheduledExecutionStatusEnum.APPLIED.toString(),
      replayed: false,
      occurrence: {
        contemplatedDate: occurrenceDate,
        occurrenceDate,
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        reason: null,
      } as ScheduledExecutionEntity,
      movement: makeMovement({publicId: `movement-${occurrenceDate}`}),
      balances: [],
      schedule: makeSchedule({
        nextContemplatedDate: nextDate,
        nextExecutionDate: nextDate,
        completedOccurrences: completed,
        totalOccurrences: null,
      }),
    });
    jest
      .spyOn(executions, 'execute')
      .mockResolvedValueOnce(outcome('2026-01-15', '2026-02-15', 1) as never)
      .mockResolvedValueOnce(outcome('2026-02-15', '2026-03-15', 2) as never)
      .mockResolvedValueOnce(outcome('2026-03-15', '2026-04-15', 3) as never);

    const response = await service.applyDue('user-public-id', {asOf: '2026-03-23'}, null);

    expect(executions.execute).toHaveBeenCalledTimes(3);
    expect(response.asOf).toBe('2026-03-23');
    expect(response.applied).toBe(3);
    expect(response.skipped).toBe(0);
    expect(response.failed).toBe(0);
    expect(response.results.map((result) => result.movementPublicId)).toEqual([
      'movement-2026-01-15',
      'movement-2026-02-15',
      'movement-2026-03-15',
    ]);
    expect(response.schedules[0].completedOccurrences).toBe(3);
    expect(executions.execute).toHaveBeenNthCalledWith(
      1,
      1,
      'schedule-public-id',
      {},
      '2026-03-23',
      {inactiveBefore: null},
    );
  });

  it('caps catch-up per schedule and stops after a failed occurrence', async () => {
    const {queries, executions, service} = setup(
      {nextContemplatedDate: '2026-01-15', nextExecutionDate: '2026-01-15'},
      {catchupBatchSize: 2},
    );
    jest.spyOn(queries, 'findDue').mockResolvedValueOnce([makeSchedule()]);
    jest.spyOn(executions, 'execute').mockResolvedValue({
      status: ScheduledExecutionStatusEnum.FAILED.toString(),
      occurrence: {
        contemplatedDate: '2020-01-15',
        occurrenceDate: '2020-01-15',
        reason: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
      } as ScheduledExecutionEntity,
      reason: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
      schedule: makeSchedule(),
    } as never);

    const response = await service.applyDue('user-public-id', {}, null);

    expect(executions.execute).toHaveBeenCalledTimes(1);
    expect(response.failed).toBe(1);
    expect(response.results).toHaveLength(1);
  });

  it('stops at the configured per-schedule batch cap', async () => {
    const {queries, executions, service} = setup(
      {nextContemplatedDate: '2026-01-15', nextExecutionDate: '2026-01-15'},
      {catchupBatchSize: 2},
    );
    jest.spyOn(queries, 'findDue').mockResolvedValueOnce([makeSchedule()]);
    const applied = (nextDate: string) => ({
      status: ScheduledExecutionStatusEnum.APPLIED.toString(),
      replayed: false,
      occurrence: {
        contemplatedDate: '2026-01-15',
        occurrenceDate: '2026-01-15',
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        reason: null,
      } as ScheduledExecutionEntity,
      movement: makeMovement(),
      balances: [],
      schedule: makeSchedule({
        nextContemplatedDate: nextDate,
        nextExecutionDate: nextDate,
        completedOccurrences: 1,
        totalOccurrences: null,
      }),
    });
    jest
      .spyOn(executions, 'execute')
      .mockResolvedValueOnce(applied('2026-11-22') as never)
      .mockResolvedValueOnce(applied('2026-11-24') as never);

    const response = await service.applyDue('user-public-id', {}, null);

    expect(executions.execute).toHaveBeenCalledTimes(2);
    expect(response.applied).toBe(2);
  });

  it('passes the D58 grace cutoff for a long-inactive user and counts inactive skips', async () => {
    const {queries, executions, service} = setup({
      nextContemplatedDate: '2026-01-15',
      nextExecutionDate: '2026-01-15',
      totalOccurrences: null,
    });
    jest.spyOn(queries, 'findDue').mockResolvedValueOnce([makeSchedule({totalOccurrences: null})]);
    jest.spyOn(executions, 'execute').mockResolvedValueOnce({
      status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
      replayed: false,
      occurrence: {
        contemplatedDate: '2026-11-15',
        occurrenceDate: '2026-11-15',
        status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
        reason: ScheduledExecutionReasonEnum.INACTIVE_USER.toString(),
      } as ScheduledExecutionEntity,
      balances: [],
      schedule: makeSchedule({
        nextContemplatedDate: '2026-12-15',
        nextExecutionDate: '2026-12-15',
        completedOccurrences: 1,
        totalOccurrences: null,
      }),
    } as never);

    const response = await service.applyDue(
      'user-public-id',
      {asOf: '2026-11-23'},
      '2020-01-01T00:00:00.000Z',
    );

    expect(executions.execute).toHaveBeenCalledWith(
      1,
      'schedule-public-id',
      {},
      '2026-11-23',
      {inactiveBefore: '2026-11-16'},
    );
    expect(response.skipped).toBe(1);
    expect(response.skippedWhileInactive).toBe(1);
    expect(response.results[0].movementPublicId).toBeNull();
  });

  it('returns an empty summary without writing when no schedule is due', async () => {
    const {executions, service} = setup();

    const response = await service.applyDue('user-public-id', {}, null);

    expect(executions.execute).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      applied: 0,
      skipped: 0,
      failed: 0,
      skippedWhileInactive: 0,
      results: [],
      schedules: [],
    });
  });

  it('soft deletes an owned schedule through the schedule write repository', async () => {
    const {updates, service} = setup();

    await expect(service.remove('user-public-id', 'schedule-public-id')).resolves.toBeUndefined();

    expect(updates.softDelete).toHaveBeenCalledWith(1, 'schedule-public-id');
  });

  it('maps a missing or already deleted schedule to 404 on delete', async () => {
    const {updates, service} = setup();
    jest
      .spyOn(updates, 'softDelete')
      .mockResolvedValueOnce({status: MovementWriteStatusEnum.NOT_FOUND.toString()});

    await expect(service.remove('user-public-id', 'schedule-public-id')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });
});

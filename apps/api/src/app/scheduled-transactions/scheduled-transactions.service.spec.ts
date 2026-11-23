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

describe('ScheduledTransactionsService (US-602–US-605)', () => {
  const setup = (overrides: Partial<ScheduledTransactionEntity> = {}) => {
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
    } as unknown as ScheduledTransactionQueryRepository;
    const updates = {
      update: jest.fn().mockResolvedValue({status: 'UPDATED', schedule}),
      setActive: jest.fn().mockResolvedValue({status: 'UPDATED', schedule}),
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
    const service = new ScheduledTransactionsService(
      profile,
      creations,
      queries,
      updates,
      executions,
      clock,
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
});

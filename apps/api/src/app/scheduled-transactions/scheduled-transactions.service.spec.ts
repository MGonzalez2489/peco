import {CategoryApplyTypeEnum, MovementWriteStatusEnum} from '@peco/enums';
import type {ScheduledTransactionEntity} from '../database/entities';
import {UtcClock} from '../database/clock/utc-clock';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
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

describe('ScheduledTransactionsService (US-602/US-603)', () => {
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
    const clock = new UtcClock();
    jest.spyOn(clock, 'now').mockReturnValue(NOW);
    const service = new ScheduledTransactionsService(profile, creations, queries, updates, clock);

    return {queries, updates, service};
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
});

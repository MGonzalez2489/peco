import {CategoryApplyTypeEnum} from '@peco/enums';
import type {ScheduledTransactionEntity} from '../database/entities';
import {UtcClock} from '../database/clock/utc-clock';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {ScheduledTransactionsService} from './scheduled-transactions.service';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {ScheduledTransactionQueryRepository} from './services/scheduled-transaction-query.repository';
import {ScheduledTransactionUpdateRepository} from './services/scheduled-transaction-update.repository';

describe('ScheduledTransactionsService (US-602)', () => {
  const schedule = {
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
    createdAt: '2026-11-23T10:00:00.000Z',
    updatedAt: '2026-11-23T10:00:00.000Z',
    category: {publicId: 'category-public-id'},
    sourceAccount: {publicId: 'source-account-public-id'},
    destinationAccount: null,
  } as unknown as ScheduledTransactionEntity;

  const setup = () => {
    const profile = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 1})} as unknown as UserProfileRepository;
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
    } as unknown as ScheduledTransactionUpdateRepository;
    const clock = new UtcClock();
    const service = new ScheduledTransactionsService(profile, creations, queries, updates, clock);

    return {queries, service};
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
});

import type {RecurrenceFrequency, ScheduledTransactionType} from '@peco/contracts';
import {MovementTypeEnum, RecurrenceFrequencyEnum, ScheduledTransactionTypeEnum} from '@peco/enums';
import type {ScheduledCommitmentAllocation} from '../types/scheduled-commitment-allocation.type';
import type {ScheduledCommitmentSchedule} from '../types/scheduled-commitment-schedule.type';
import {buildScheduledCommitments} from './build-scheduled-commitments.util';

const EXPENSE = MovementTypeEnum.EXPENSE.toString();
const INCOME = MovementTypeEnum.INCOME.toString();
const MONTHLY = RecurrenceFrequencyEnum.MONTHLY.toString();

const allocation = (
  id: number,
  type: ScheduledCommitmentAllocation['type'],
  categoryId: number,
  amount: number,
): ScheduledCommitmentAllocation => ({id, type, categoryId, amount});

const schedule = (
  overrides: Partial<ScheduledCommitmentSchedule> = {},
): ScheduledCommitmentSchedule =>
  ({
    id: 1,
    estimatedAmount: 50_000,
    type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
    categoryId: 2,
    anchorDate: '2026-11-09',
    frequency: MONTHLY as RecurrenceFrequency,
    interval: 1,
    nextContemplatedDate: '2026-11-09',
    nextExecutionDate: '2026-11-09',
    endDate: null,
    totalOccurrences: null,
    completedOccurrences: 0,
    ...overrides,
  }) as ScheduledCommitmentSchedule;

describe('buildScheduledCommitments (US-805)', () => {
  it('uses only applied executions for a past period', () => {
    const applied = [allocation(10, EXPENSE, 2, 100_000)];

    expect(
      buildScheduledCommitments(
        '2026-10-01',
        '2026-10-31',
        false,
        applied,
        [schedule({anchorDate: '2026-10-01', nextContemplatedDate: '2026-10-01'})],
      ),
    ).toEqual(applied);
  });

  it('adds pending grid points for the current period and honours endDate', () => {
    const applied = [allocation(10, EXPENSE, 2, 100_000)];

    const result = buildScheduledCommitments(
      '2026-11-01',
      '2026-11-30',
      true,
      applied,
      [
        schedule({
          id: 1,
          type: ScheduledTransactionTypeEnum.INCOME.toString() as ScheduledTransactionType,
          categoryId: 3,
          estimatedAmount: 300_000,
          anchorDate: '2026-11-01',
          nextContemplatedDate: '2026-11-01',
          nextExecutionDate: '2026-11-01',
        }),
        schedule({
          id: 2,
          anchorDate: '2026-11-01',
          nextContemplatedDate: '2026-11-01',
          frequency: RecurrenceFrequencyEnum.WEEKLY.toString() as RecurrenceFrequency,
          endDate: '2026-11-16',
        }),
      ],
    );

    expect(result.filter((item) => item.type === EXPENSE)).toHaveLength(4);
    expect(result.filter((item) => item.type === EXPENSE)).toEqual([
      applied[0],
      {id: 200_000, categoryId: 2, type: EXPENSE, amount: 50_000},
      {id: 200_001, categoryId: 2, type: EXPENSE, amount: 50_000},
      {id: 200_002, categoryId: 2, type: EXPENSE, amount: 50_000},
    ]);
    expect(result.filter((item) => item.type === INCOME)).toEqual([
      {id: 100_000, categoryId: 3, type: INCOME, amount: 300_000},
    ]);
  });

  it('projects a future period, skipping grid points before its first day', () => {
    const result = buildScheduledCommitments(
      '2026-12-01',
      '2026-12-31',
      true,
      [],
      [schedule({anchorDate: '2026-11-01', nextContemplatedDate: '2026-11-01'})],
    );

    expect(result).toEqual([{id: 100_001, categoryId: 2, type: EXPENSE, amount: 50_000}]);
  });

  it('respects the totalOccurrences cap', () => {
    expect(
      buildScheduledCommitments(
        '2026-11-01',
        '2026-11-30',
        true,
        [],
        [schedule({totalOccurrences: 2, completedOccurrences: 2})],
      ),
    ).toEqual([]);
  });
});

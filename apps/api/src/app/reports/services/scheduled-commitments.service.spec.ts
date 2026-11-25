import type {AccountType, RecurrenceFrequency, ScheduledTransactionType} from '@peco/contracts';
import {
  AccountTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {ApiException} from '../../common/http/api-exception';
import {UtcClock} from '../../database/clock/utc-clock';
import type {UserEntity} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {AccountRepository} from '../../accounts/services/account.repository';
import type {CategoryDistributionCategory} from '../types/category-distribution-category.type';
import type {ScheduledCommitmentAllocation} from '../types/scheduled-commitment-allocation.type';
import type {ScheduledCommitmentSchedule} from '../types/scheduled-commitment-schedule.type';
import {CategoryDistributionRepository} from './category-distribution.repository';
import {ScheduledCommitmentsRepository} from './scheduled-commitments.repository';
import {ScheduledCommitmentsService} from './scheduled-commitments.service';

const NOW = '2026-11-05T10:00:00.000Z';
const USER_PUBLIC_ID = 'user-public-id';
const EXPENSE = MovementTypeEnum.EXPENSE.toString();
const INCOME = MovementTypeEnum.INCOME.toString();

const category = (
  id: number,
  publicId: string,
  displayName: string,
  overrides: Partial<CategoryDistributionCategory> = {},
): CategoryDistributionCategory =>
  ({
    id,
    publicId,
    userId: null,
    displayName,
    color: '#F97316',
    icon: 'utensils',
    isRoot: false,
    ...overrides,
  }) as CategoryDistributionCategory;

const schedule = (
  overrides: Partial<ScheduledCommitmentSchedule> = {},
): ScheduledCommitmentSchedule =>
  ({
    id: 1,
    estimatedAmount: 320_000,
    type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
    categoryId: 4,
    anchorDate: '2026-11-02',
    frequency: RecurrenceFrequencyEnum.MONTHLY.toString() as RecurrenceFrequency,
    interval: 1,
    nextContemplatedDate: '2026-11-02',
    nextExecutionDate: '2026-11-02',
    endDate: null,
    totalOccurrences: null,
    completedOccurrences: 0,
    ...overrides,
  }) as ScheduledCommitmentSchedule;

describe('ScheduledCommitmentsService (US-805)', () => {
  let users: {findActiveByPublicId: jest.Mock};
  let commitments: {findApplied: jest.Mock; findPendingSchedules: jest.Mock};
  let categories: {findVisibleCategories: jest.Mock};
  let accounts: {findActiveByUser: jest.Mock};
  let service: ScheduledCommitmentsService;

  beforeEach(() => {
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7} as UserEntity)};
    commitments = {findApplied: jest.fn().mockResolvedValue([]), findPendingSchedules: jest.fn().mockResolvedValue([])};
    categories = {findVisibleCategories: jest.fn().mockResolvedValue([])};
    accounts = {findActiveByUser: jest.fn().mockResolvedValue([])};
    service = new ScheduledCommitmentsService(
      users as unknown as UserProfileRepository,
      commitments as unknown as ScheduledCommitmentsRepository,
      categories as unknown as CategoryDistributionRepository,
      accounts as unknown as AccountRepository,
      {now: () => NOW} as UtcClock,
    );
  });

  it('combines applied and pending amounts with the live available balance', async () => {
    commitments.findApplied.mockResolvedValue([
      {id: 10, categoryId: 2, type: EXPENSE, amount: 100_000},
    ] satisfies ScheduledCommitmentAllocation[]);
    commitments.findPendingSchedules.mockResolvedValue([
      schedule({
        id: 2,
        type: ScheduledTransactionTypeEnum.INCOME.toString() as ScheduledTransactionType,
        categoryId: 3,
        estimatedAmount: 500_000,
        anchorDate: '2026-11-01',
        nextContemplatedDate: '2026-11-01',
        nextExecutionDate: '2026-11-01',
      }),
      schedule(),
    ]);
    categories.findVisibleCategories.mockResolvedValue([
      category(1, 'root-id', 'Otros', {isRoot: true}),
      category(2, 'food-id', 'Comida'),
      category(3, 'payroll-id', 'Nómina'),
      category(4, 'services-id', 'Servicios'),
    ]);
    accounts.findActiveByUser.mockResolvedValue([
      {type: AccountTypeEnum.CASH.toString() as AccountType, currentBalance: 400_000, includeInTotal: true},
      {type: AccountTypeEnum.CREDIT.toString() as AccountType, currentBalance: -120_000, includeInTotal: true},
      {type: AccountTypeEnum.SAVINGS.toString() as AccountType, currentBalance: 999_999, includeInTotal: false},
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-11');

    expect(users.findActiveByPublicId).toHaveBeenCalledWith(USER_PUBLIC_ID);
    expect(commitments.findApplied).toHaveBeenCalledWith(7, '2026-11-01', '2026-11-30');
    expect(commitments.findPendingSchedules).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      period: '2026-11',
      monthlyIncome: 500_000,
      monthlyExpenses: 420_000,
      netProjectedImpact: 80_000,
      projectedAvailableBalance: 480_000,
      incomeCommitmentPercentage: 84,
      expenseDistribution: [
        {
          categoryPublicId: 'services-id',
          displayName: 'Servicios',
          color: '#F97316',
          icon: 'utensils',
          amount: 320_000,
          percentage: 76,
        },
        {
          categoryPublicId: 'food-id',
          displayName: 'Comida',
          color: '#F97316',
          icon: 'utensils',
          amount: 100_000,
          percentage: 24,
        },
      ],
      incomeDistribution: [
        {
          categoryPublicId: 'payroll-id',
          displayName: 'Nómina',
          color: '#F97316',
          icon: 'utensils',
          amount: 500_000,
          percentage: 100,
        },
      ],
    });
  });

  it('uses only applied executions for a past period', async () => {
    commitments.findApplied.mockResolvedValue([
      {id: 11, categoryId: 2, type: INCOME, amount: 100_000},
    ] satisfies ScheduledCommitmentAllocation[]);
    categories.findVisibleCategories.mockResolvedValue([
      category(1, 'root-id', 'Otros', {isRoot: true}),
      category(2, 'payroll-id', 'Nómina'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-10');

    expect(commitments.findApplied).toHaveBeenCalledWith(7, '2026-10-01', '2026-10-31');
    expect(commitments.findPendingSchedules).not.toHaveBeenCalled();
    expect(result.monthlyIncome).toBe(100_000);
    expect(result.monthlyExpenses).toBe(0);
    expect(result.netProjectedImpact).toBe(100_000);
    expect(result.projectedAvailableBalance).toBe(100_000);
    expect(result.incomeCommitmentPercentage).toBe(0);
    expect(result.incomeDistribution).toMatchObject([
      {categoryPublicId: 'payroll-id', amount: 100_000, percentage: 100},
    ]);
    expect(result.expenseDistribution).toEqual([]);
  });

  it('answers 404 for an inactive or unknown user without reading commitments', async () => {
    users.findActiveByPublicId.mockResolvedValue(null);

    const error = await service
      .find('foreign-public-id', '2026-11')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
    expect(commitments.findApplied).not.toHaveBeenCalled();
    expect(commitments.findPendingSchedules).not.toHaveBeenCalled();
  });
});

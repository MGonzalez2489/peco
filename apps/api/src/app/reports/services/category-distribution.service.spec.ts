import type {MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {ApiException} from '../../common/http/api-exception';
import type {UserEntity} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {CategoryDistributionCategory} from '../types/category-distribution-category.type';
import type {CategoryDistributionRow} from '../types/category-distribution-row.type';
import {CategoryDistributionRepository} from './category-distribution.repository';
import {CategoryDistributionService} from './category-distribution.service';

const USER_PUBLIC_ID = 'user-public-id';
const EXPENSE = MovementTypeEnum.EXPENSE.toString();

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

const movement = (
  id: number,
  categoryId: number,
  type: MovementType,
  amount: number,
): CategoryDistributionRow => ({id, categoryId, type, amount}) as CategoryDistributionRow;

describe('CategoryDistributionService (US-804)', () => {
  let users: {findActiveByPublicId: jest.Mock};
  let distribution: {findPeriodMovements: jest.Mock; findVisibleCategories: jest.Mock};
  let service: CategoryDistributionService;

  beforeEach(() => {
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7} as UserEntity)};
    distribution = {
      findPeriodMovements: jest.fn().mockResolvedValue([]),
      findVisibleCategories: jest.fn().mockResolvedValue([]),
    };
    service = new CategoryDistributionService(
      users as unknown as UserProfileRepository,
      distribution as unknown as CategoryDistributionRepository,
    );
  });

  it('builds the owner-scoped ledger distribution for the requested type', async () => {
    distribution.findPeriodMovements.mockResolvedValue([
      movement(1, 2, EXPENSE, 90_000),
      movement(2, 3, EXPENSE, 55_000),
      movement(3, 2, MovementTypeEnum.INCOME.toString(), 999_999),
    ]);
    distribution.findVisibleCategories.mockResolvedValue([
      category(1, 'root-id', 'Otros', {isRoot: true}),
      category(2, 'food-id', 'Comida'),
      category(3, 'services-id', 'Servicios'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-11', EXPENSE);

    expect(users.findActiveByPublicId).toHaveBeenCalledWith(USER_PUBLIC_ID);
    expect(distribution.findPeriodMovements).toHaveBeenCalledWith(7, '2026-11');
    expect(distribution.findVisibleCategories).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      period: '2026-11',
      type: EXPENSE,
      total: 145_000,
      items: [
        {
          categoryPublicId: 'food-id',
          displayName: 'Comida',
          color: '#F97316',
          icon: 'utensils',
          amount: 90_000,
          percentage: 62,
        },
        {
          categoryPublicId: 'services-id',
          displayName: 'Servicios',
          color: '#F97316',
          icon: 'utensils',
          amount: 55_000,
          percentage: 38,
        },
      ],
    });
  });

  it('answers 404 for an inactive or foreign user without reading the ledger', async () => {
    users.findActiveByPublicId.mockResolvedValue(null);

    const error = await service
      .find('foreign-public-id', '2026-11', EXPENSE)
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
    expect(distribution.findPeriodMovements).not.toHaveBeenCalled();
    expect(distribution.findVisibleCategories).not.toHaveBeenCalled();
  });
});

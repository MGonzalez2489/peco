import type {MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import type {CategoryDistributionCategory} from '../types/category-distribution-category.type';
import type {CategoryDistributionRow} from '../types/category-distribution-row.type';
import {buildCategoryDistribution} from './build-category-distribution.util';

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

const EXPENSE = MovementTypeEnum.EXPENSE.toString();
const INCOME = MovementTypeEnum.INCOME.toString();
const TRANSFER = MovementTypeEnum.TRANSFER.toString();

describe('buildCategoryDistribution (US-804)', () => {
  it('totals each active category and rounds shares that add up to 100', () => {
    const food = category(2, 'food-id', 'Comida');
    const services = category(3, 'services-id', 'Servicios');
    const unused = category(4, 'unused-id', 'Sin movimientos');

    const {total, items} = buildCategoryDistribution(
      EXPENSE,
      [
        movement(1, 2, EXPENSE, 90_000),
        movement(2, 3, EXPENSE, 55_000),
        movement(3, 4, INCOME, 999_999),
        movement(4, 2, TRANSFER, 500_000),
      ],
      [category(1, 'root-id', 'Otros', {isRoot: true}), food, services, unused],
    );

    expect(total).toBe(145_000);
    expect(items).toHaveLength(2);
    expect(items.map(({categoryPublicId}) => categoryPublicId)).toEqual(['food-id', 'services-id']);
    expect(items.map(({amount, percentage}) => ({amount, percentage}))).toEqual([
      {amount: 90_000, percentage: 62},
      {amount: 55_000, percentage: 38},
    ]);
    expect(items.reduce((sum, item) => sum + item.percentage, 0)).toBe(100);
  });

  it('groups reassigned rows under the global root and ignores other movement types', () => {
    const root = category(1, 'root-id', 'Otros', {isRoot: true});
    const own = category(2, 'own-id', 'Café', {userId: 7});

    const {total, items} = buildCategoryDistribution(
      EXPENSE,
      [
        movement(1, 2, EXPENSE, 10_000),
        movement(2, 99, EXPENSE, 5_000),
        movement(3, 2, INCOME, 999_999),
      ],
      [root, own],
    );

    expect(total).toBe(15_000);
    expect(items).toEqual([
      {
        categoryPublicId: 'own-id',
        displayName: 'Café',
        color: '#F97316',
        icon: 'utensils',
        amount: 10_000,
        percentage: 67,
      },
      {
        categoryPublicId: 'root-id',
        displayName: 'Otros',
        color: '#F97316',
        icon: 'utensils',
        amount: 5_000,
        percentage: 33,
      },
    ]);
  });

  it('returns an empty distribution when the period has no matching rows', () => {
    expect(
      buildCategoryDistribution(INCOME, [], [category(1, 'root-id', 'Otros', {isRoot: true})]),
    ).toEqual({total: 0, items: []});
  });
});

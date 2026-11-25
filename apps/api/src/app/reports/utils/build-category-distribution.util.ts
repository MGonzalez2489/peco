import type {CategoryDistributionItem, MovementType} from '@peco/contracts';
import type {CategoryDistributionCategory} from '../types/category-distribution-category.type';
import type {CategoryDistributionRow} from '../types/category-distribution-row.type';

interface WeightedCategory {
  category: CategoryDistributionCategory;
  amount: number;
  floor: number;
  remainder: number;
}

const byAmount = (left: WeightedCategory, right: WeightedCategory): number =>
  right.amount - left.amount || left.category.publicId.localeCompare(right.category.publicId);

/**
 * Totals the ledger rows of one movement type per active category and derives
 * integer percentages that always add up to 100 using the largest remainder.
 * Rows whose category is no longer active fall back to the global root (D43);
 * transfers and canceled rows are already excluded by the repository (D63).
 */
export const buildCategoryDistribution = (
  type: MovementType,
  movements: readonly CategoryDistributionRow[],
  categories: readonly CategoryDistributionCategory[],
): {total: number; items: CategoryDistributionItem[]} => {
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const root = categories.find((category) => category.userId === null && category.isRoot);
  const amounts = new Map<CategoryDistributionCategory, number>();
  let total = 0;

  for (const movement of movements) {
    if (movement.type !== type) {
      continue;
    }

    const category = categoriesById.get(movement.categoryId) ?? root;
    if (!category) {
      continue;
    }

    amounts.set(category, (amounts.get(category) ?? 0) + movement.amount);
    total += movement.amount;
  }

  const weighted: WeightedCategory[] = [...amounts.entries()]
    .map(([category, amount]) => {
      const exact = total > 0 ? (amount / total) * 100 : 0;
      const floor = Math.floor(exact);
      return {category, amount, floor, remainder: exact - floor};
    })
    .sort(byAmount);

  let remaining = total > 0 ? 100 - weighted.reduce((sum, item) => sum + item.floor, 0) : 0;
  const remainderOrder = [...weighted].sort(
    (left, right) => right.remainder - left.remainder || byAmount(left, right),
  );
  for (const item of remainderOrder) {
    if (remaining <= 0) {
      break;
    }
    item.floor += 1;
    remaining -= 1;
  }

  return {
    total,
    items: weighted.map(({category, amount, floor}) => ({
      categoryPublicId: category.publicId,
      displayName: category.displayName,
      color: category.color,
      icon: category.icon,
      amount,
      percentage: floor,
    })),
  };
};

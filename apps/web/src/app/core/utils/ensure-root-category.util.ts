import {Category} from '../models/category.model';
import {ADJUSTMENT_CATEGORY_ID} from '../constants/adjustment-category-id.constant';
import {DEFAULT_CATEGORY_COLOR} from '../constants/default-category-color.constant';
import {ROOT_CATEGORY_ID} from '../constants/root-category-id.constant';

const FALLBACK_ROOT_ICON: Category['icon'] = 'folder-open';

const SYSTEM_TRANSFER_ID = 'transfer';
const SYSTEM_TRANSFER_NAME = 'transfer';

const SYSTEM_ADJUSTMENT_NAME = 'adjustment';
const SYSTEM_ADJUSTMENT_COLOR = '#64748B';

const seedRoot = (): Category => ({
  id: ROOT_CATEGORY_ID,
  name: ROOT_CATEGORY_ID,
  displayName: 'Otros',
  icon: FALLBACK_ROOT_ICON,
  color: DEFAULT_CATEGORY_COLOR,
  applyType: 'BOTH',
  isRoot: true,
});

const seedAdjustment = (): Category => ({
  id: ADJUSTMENT_CATEGORY_ID,
  name: SYSTEM_ADJUSTMENT_NAME,
  displayName: 'Ajuste de Saldo',
  icon: 'scale',
  color: SYSTEM_ADJUSTMENT_COLOR,
  applyType: 'BOTH',
  isSystem: true,
});

const isTransferCategory = (category: Category): boolean =>
  category.id === SYSTEM_TRANSFER_ID ||
  category.name === SYSTEM_TRANSFER_NAME ||
  (category.isSystem === true && category.applyType === 'TRANSFER');

const ensureSystemFlags = (categories: Category[]): Category[] => {
  return categories.map((category) => {
    if (isTransferCategory(category)) {
      return {
        ...category,
        id: SYSTEM_TRANSFER_ID,
        name: SYSTEM_TRANSFER_NAME,
        displayName: category.displayName || 'Transferencia',
        applyType: 'TRANSFER' as const,
        isSystem: true,
        isRoot: false,
      };
    }

    return category;
  });
};

const ensureAdjustmentCategory = (categories: Category[]): Category[] => {
  if (categories.some((category) => category.id === ADJUSTMENT_CATEGORY_ID)) return categories;
  return [...categories, seedAdjustment()];
};

const findRoot = (categories: Category[]): Category | undefined =>
  categories.find((category) => category.id === ROOT_CATEGORY_ID || category.isRoot === true);

const isRootComplete = (category: Category | undefined): boolean =>
  category !== undefined &&
  typeof category.icon === 'string' &&
  typeof category.color === 'string' &&
  category.color.length > 0;

export const ensureRootCategory = (categories: Category[]): Category[] => {
  const normalized = ensureAdjustmentCategory(ensureSystemFlags(categories));
  const existingRoot = findRoot(normalized);

  if (isRootComplete(existingRoot)) return normalized;

  const root: Category = {
    ...seedRoot(),
    ...existingRoot,
    id: ROOT_CATEGORY_ID,
    isRoot: true,
  };

  return [root, ...normalized.filter((category) => category.id !== root.id)];
};

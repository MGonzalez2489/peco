import {Category} from '../models/category.model';
import {DEFAULT_CATEGORY_COLOR} from '../constants/default-category-color.constant';
import {ROOT_CATEGORY_ID} from '../constants/root-category-id.constant';

const FALLBACK_ROOT_ICON: Category['icon'] = 'folder-open';

const seedRoot = (): Category => ({
  id: ROOT_CATEGORY_ID,
  name: ROOT_CATEGORY_ID,
  displayName: 'Otros',
  icon: FALLBACK_ROOT_ICON,
  color: DEFAULT_CATEGORY_COLOR,
  applyType: 'BOTH',
  isRoot: true,
});

const findRoot = (categories: Category[]): Category | undefined =>
  categories.find((category) => category.id === ROOT_CATEGORY_ID || category.isRoot === true);

const isRootComplete = (category: Category | undefined): boolean =>
  category !== undefined &&
  typeof category.icon === 'string' &&
  typeof category.color === 'string' &&
  category.color.length > 0;

export const ensureRootCategory = (categories: Category[]): Category[] => {
  const existingRoot = findRoot(categories);

  if (isRootComplete(existingRoot)) return categories;

  const root: Category = {
    ...seedRoot(),
    ...existingRoot,
    id: ROOT_CATEGORY_ID,
    isRoot: true,
  };

  return [root, ...categories.filter((category) => category.id !== root.id)];
};

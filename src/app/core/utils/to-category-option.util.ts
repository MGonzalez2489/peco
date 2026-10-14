import {Category} from '../models/category.model';
import {SelectOption} from '../models/select-option.model';

export const toCategoryOption = (category: Category): SelectOption => ({
  value: category.id,
  label: category.displayName,
  icon: category.icon,
  color: category.color,
});

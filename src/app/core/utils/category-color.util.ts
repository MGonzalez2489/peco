import {CATEGORY_COLORS} from '../constants/category-colors.constant';
import {CategoryColor} from '../types/category-color.type';

export function categoryColor(color?: string): {text: string; chip: string; bar: string} {
  return CATEGORY_COLORS[(color ?? 'indigo') as CategoryColor] ?? CATEGORY_COLORS.indigo;
}

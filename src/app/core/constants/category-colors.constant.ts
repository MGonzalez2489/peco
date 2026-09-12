import {CategoryColor} from '../types/category-color.type';

export const CATEGORY_COLORS: Record<CategoryColor, {text: string; chip: string; bar: string}> = {
  indigo: {
    text: 'text-indigo-600 dark:text-indigo-400',
    chip: 'bg-indigo-500',
    bar: 'bg-indigo-500',
  },
  emerald: {
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-500',
    bar: 'bg-emerald-500',
  },
  amber: {text: 'text-amber-600 dark:text-amber-400', chip: 'bg-amber-500', bar: 'bg-amber-500'},
  rose: {text: 'text-rose-600 dark:text-rose-400', chip: 'bg-rose-500', bar: 'bg-rose-500'},
  violet: {
    text: 'text-violet-600 dark:text-violet-400',
    chip: 'bg-violet-500',
    bar: 'bg-violet-500',
  },
  sky: {text: 'text-sky-600 dark:text-sky-400', chip: 'bg-sky-500', bar: 'bg-sky-500'},
};

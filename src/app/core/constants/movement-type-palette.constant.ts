import {MovementType} from '../types/movement-type.type';

export const MOVEMENT_TYPE_PALETTE: Record<
  MovementType,
  {text: string; chip: string; sign: string}
> = {
  INCOME: {
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    sign: '+',
  },
  EXPENSE: {
    text: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
    sign: '-',
  },
  TRANSFER: {
    text: 'text-sky-600 dark:text-sky-400',
    chip: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-400',
    sign: '',
  },
};

export type MovementType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface Category {
  id: string;
  name: string;
  currentBalance: number;
  targetGoal?: number;
  color?: string;
  icon?: string;
}

export interface Movement {
  id: string;
  categoryId: string;
  type: MovementType;
  amount: number;
  date: string;
  note?: string;
  destinationCategoryId?: string;
}

export interface CreateCategoryDTO {
  name: string;
  initialBalance: number;
  targetGoal?: number;
  color?: string;
  icon?: string;
}

export interface CreateMovementDTO {
  categoryId: string;
  type: MovementType;
  amount: number;
  date?: string;
  note?: string;
  destinationCategoryId?: string;
}

export const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  INCOME: 'Ingreso',
  EXPENSE: 'Egreso',
  TRANSFER: 'Transferencia',
};

export const CATEGORY_COLORS = {
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
} as const;

export type CategoryColor = keyof typeof CATEGORY_COLORS;

export function categoryColor(color?: string): {text: string; chip: string; bar: string} {
  return CATEGORY_COLORS[(color ?? 'indigo') as CategoryColor] ?? CATEGORY_COLORS.indigo;
}

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

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(value);

export function deletionImpact(
  movement: Pick<Movement, 'type' | 'amount' | 'categoryId' | 'destinationCategoryId'>,
  sourceCategoryName: string,
  destinationCategoryName?: string,
): string {
  switch (movement.type) {
    case 'EXPENSE':
      return `+${formatCurrency(movement.amount)} se devolverá al saldo de la categoría ${sourceCategoryName}.`;
    case 'INCOME':
      return `-${formatCurrency(movement.amount)} se descontará del saldo de la categoría ${sourceCategoryName}.`;
    case 'TRANSFER':
      return `Se revertirán los saldos de ${sourceCategoryName} y ${destinationCategoryName ?? 'la categoría destino'}.`;
  }
}

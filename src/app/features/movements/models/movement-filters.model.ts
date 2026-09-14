import {Movement} from '@core/models';

export type MovementFilterType = 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER';

export interface MovementFilters {
  type: MovementFilterType;
  accountId: string;
  hideReversals: boolean;
}

export interface GrupoMovimientos {
  fecha: string;
  movimientos: Movement[];
}

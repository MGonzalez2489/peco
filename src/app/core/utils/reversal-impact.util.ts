import {Movement} from '../models/movement.model';
import {formatCurrency} from './format-currency.util';

export function reversalImpact(
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

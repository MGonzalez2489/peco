import {Movement} from '../models/movement.model';
import {formatCurrency} from './format-currency.util';

export function reversalImpact(
  movement: Pick<Movement, 'type' | 'amount' | 'accountId' | 'targetAccountId'>,
  sourceAccountName: string,
  destinationAccountName?: string,
): string {
  switch (movement.type) {
    case 'EXPENSE':
      return `+${formatCurrency(movement.amount)} se devolverá al saldo de la cuenta ${sourceAccountName}.`;
    case 'INCOME':
      return `-${formatCurrency(movement.amount)} se descontará del saldo de la cuenta ${sourceAccountName}.`;
    case 'TRANSFER':
      return `Se revertirán los saldos de ${sourceAccountName} y ${destinationAccountName ?? 'la cuenta destino'}.`;
    default:
      return '';
  }
}

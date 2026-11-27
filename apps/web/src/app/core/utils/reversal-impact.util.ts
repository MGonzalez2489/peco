import {Movement} from '../models/movement.model';
import {formatCentsToCurrency} from './format-cents-to-currency.util';
import {MovementTypeEnum} from '@peco/enums';

export function reversalImpact(
  movement: Pick<Movement, 'type' | 'amount' | 'accountId' | 'targetAccountId'>,
  sourceAccountName: string,
  destinationAccountName?: string,
): string {
  switch (movement.type) {
    case MovementTypeEnum.EXPENSE.toString():
      return `+${formatCentsToCurrency(movement.amount)} se devolverá al saldo de la cuenta ${sourceAccountName}.`;
    case MovementTypeEnum.INCOME.toString():
      return `-${formatCentsToCurrency(movement.amount)} se descontará del saldo de la cuenta ${sourceAccountName}.`;
    case MovementTypeEnum.TRANSFER.toString():
      return `Se revertirán los saldos de ${sourceAccountName} y ${destinationAccountName ?? 'la cuenta destino'}.`;
    default:
      return '';
  }
}

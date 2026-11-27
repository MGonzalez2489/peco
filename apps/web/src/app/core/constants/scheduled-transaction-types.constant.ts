import {ScheduledTransactionType} from '../models/scheduled-transaction-type.model';
import {ScheduledTransactionTypeEnum} from '@peco/enums';

export const SCHEDULED_TRANSACTION_TYPES: ScheduledTransactionType[] = [
  {
    key: ScheduledTransactionTypeEnum.INCOME.toString(),
    name: 'Ingreso',
    color: 'emerald',
    icon: 'chevron-up',
  },
  {
    key: ScheduledTransactionTypeEnum.EXPENSE.toString(),
    name: 'Egreso',
    color: 'rose',
    icon: 'chevron-down',
  },
  {
    key: ScheduledTransactionTypeEnum.TRANSFER.toString(),
    name: 'Transferencia',
    color: 'sky',
    icon: 'arrow-left-right',
  },
];

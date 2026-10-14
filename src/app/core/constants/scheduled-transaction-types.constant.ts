import {ScheduledTransactionType} from '../models/scheduled-transaction-type.model';
import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.enum';

export const SCHEDULED_TRANSACTION_TYPES: ScheduledTransactionType[] = [
  {key: ScheduledTransactionTypeKey.INCOME, name: 'Ingreso', color: 'emerald', icon: 'chevron-up'},
  {key: ScheduledTransactionTypeKey.EXPENSE, name: 'Egreso', color: 'rose', icon: 'chevron-down'},
  {
    key: ScheduledTransactionTypeKey.TRANSFER,
    name: 'Transferencia',
    color: 'sky',
    icon: 'arrow-left-right',
  },
];

import {AccountTypeDefinition} from '../models/account-type-definition.model';
import {AccountTypeEnum} from '@peco/enums';

export const ACCOUNT_TYPES: AccountTypeDefinition[] = [
  {
    key: AccountTypeEnum.CASH.toString(),
    name: 'Efectivo',
    pluralName: 'Efectivo',
    color: 'emerald',
    icon: 'banknote',
  },
  {
    key: AccountTypeEnum.DEBIT.toString(),
    name: 'Débito',
    pluralName: 'Débito',
    color: 'sky',
    icon: 'credit-card',
  },
  {
    key: AccountTypeEnum.CREDIT.toString(),
    name: 'Crédito',
    pluralName: 'Crédito',
    color: 'rose',
    icon: 'credit-card',
  },
  {
    key: AccountTypeEnum.SAVINGS.toString(),
    name: 'Ahorros',
    pluralName: 'Ahorro',
    color: 'amber',
    icon: 'piggy-bank',
  },
];

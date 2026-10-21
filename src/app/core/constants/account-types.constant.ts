import {AccountTypeDefinition} from '../models/account-type-definition.model';

export const ACCOUNT_TYPES: AccountTypeDefinition[] = [
  {
    key: 'CASH',
    name: 'Efectivo',
    pluralName: 'Efectivo',
    color: 'emerald',
    icon: 'banknote',
  },
  {
    key: 'DEBIT',
    name: 'Débito',
    pluralName: 'Débito',
    color: 'sky',
    icon: 'credit-card',
  },
  {
    key: 'CREDIT',
    name: 'Crédito',
    pluralName: 'Crédito',
    color: 'rose',
    icon: 'credit-card',
  },
  {
    key: 'SAVINGS',
    name: 'Ahorros',
    pluralName: 'Ahorro',
    color: 'amber',
    icon: 'piggy-bank',
  },
];

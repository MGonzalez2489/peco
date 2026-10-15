import {AccountType} from '../models/account-type.model';
import {AccountTypeKey} from '../types/account-type-key.enum';

export const ACCOUNT_TYPES: AccountType[] = [
  {key: AccountTypeKey.CASH, name: 'Efectivo', color: 'emerald', icon: 'banknote'},
  {key: AccountTypeKey.DEBIT, name: 'Débito', color: 'blue', icon: 'credit-card'},
  {key: AccountTypeKey.CREDIT, name: 'Crédito', color: 'rose', icon: 'credit-card'},
  {key: AccountTypeKey.SAVINGS, name: 'Ahorros', color: 'amber', icon: 'piggy-bank'},
];

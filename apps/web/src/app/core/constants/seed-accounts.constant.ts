import {Account} from '../models/account.model';
import {AccountTypeEnum} from '@peco/enums';

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 0,
    type: AccountTypeEnum.CASH.toString(),
    includeInTotal: true,
    createdAt: new Date().toISOString(), // '2026-01-01T00:00:00.000Z',
    pinToHome: true,
    isRoot: true,
  },
];

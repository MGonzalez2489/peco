import {ACCOUNT_TYPE_MAP} from './account-type-map.constant';
import {Account} from '../models/account.model';
import {AccountTypeKey} from '../types/account-type-key.enum';

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 0,
    type: ACCOUNT_TYPE_MAP[AccountTypeKey.CASH],
    includeInTotal: true,
    createdAt: new Date().toISOString(), // '2026-01-01T00:00:00.000Z',
    pinToHome: true,
    isRoot: true,
  },
];

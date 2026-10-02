import {Account} from '../models/account.model';

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 0,
    color: 'emerald',
    icon: 'wallet',
    pinToHome: true,
    isRoot: true,
  },
];

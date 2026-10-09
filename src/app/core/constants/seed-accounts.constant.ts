import {Account} from '../models/account.model';

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 0,
    includeInTotal: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    color: 'emerald',
    icon: 'wallet',
    pinToHome: true,
    isRoot: true,
  },
];

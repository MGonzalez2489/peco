import {Account} from '../models/account.model';

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 0,
    type: 'CASH',
    includeInTotal: true,
    createdAt: new Date().toISOString(), // '2026-01-01T00:00:00.000Z',
    pinToHome: true,
    isRoot: true,
  },
];

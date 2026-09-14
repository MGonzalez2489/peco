import {Movement} from '../models/movement.model';

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

export const SEED_MOVEMENTS: Movement[] = [
  {
    id: 'm-1',
    accountId: 'c-cash',
    categoryId: 'payroll',
    type: 'INCOME',
    amount: 2000,
    date: daysAgo(6),
    note: 'Nómina',
  },
  {
    id: 'm-2',
    accountId: 'c-cash',
    categoryId: 'services',
    type: 'EXPENSE',
    amount: 550,
    date: daysAgo(5),
    note: 'Mercado',
  },
  {
    id: 'm-3',
    accountId: 'c-cash',
    categoryId: 'services',
    type: 'EXPENSE',
    amount: 320,
    date: daysAgo(3),
    note: 'Restaurante',
  },
  {
    id: 'm-4',
    accountId: 'c-savings',
    categoryId: 'payroll',
    type: 'INCOME',
    amount: 1000,
    date: daysAgo(4),
    note: 'Bonificación',
  },
  {
    id: 'm-5',
    accountId: 'c-cash',
    categoryId: 'transfer',
    type: 'TRANSFER',
    amount: 700,
    date: daysAgo(2),
    targetAccountId: 'c-savings',
    note: 'Ahorro automático',
  },
  {
    id: 'm-6',
    accountId: 'c-investment',
    categoryId: 'payroll',
    type: 'INCOME',
    amount: 800,
    date: daysAgo(1),
    note: 'Dividendos',
  },
];

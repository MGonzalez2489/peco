import {Movement} from '../models/movement.model';

const daysAgo = (days: number): string => new Date(Date.now() - days * 86_400_000).toISOString();

export const SEED_MOVEMENTS: Movement[] = [
  {
    id: 'm-1',
    categoryId: 'c-cash',
    type: 'INCOME',
    amount: 2000,
    date: daysAgo(6),
    note: 'Nómina',
  },
  {
    id: 'm-2',
    categoryId: 'c-cash',
    type: 'EXPENSE',
    amount: 550,
    date: daysAgo(5),
    note: 'Mercado',
  },
  {
    id: 'm-3',
    categoryId: 'c-cash',
    type: 'EXPENSE',
    amount: 320,
    date: daysAgo(3),
    note: 'Restaurante',
  },
  {
    id: 'm-4',
    categoryId: 'c-savings',
    type: 'INCOME',
    amount: 1000,
    date: daysAgo(4),
    note: 'Bonificación',
  },
  {
    id: 'm-5',
    categoryId: 'c-cash',
    type: 'TRANSFER',
    amount: 700,
    date: daysAgo(2),
    destinationCategoryId: 'c-savings',
    note: 'Ahorro automático',
  },
  {
    id: 'm-6',
    categoryId: 'c-investment',
    type: 'INCOME',
    amount: 800,
    date: daysAgo(1),
    note: 'Dividendos',
  },
];

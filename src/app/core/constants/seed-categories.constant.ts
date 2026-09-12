import {Category} from '../models/category.model';

export const SEED_CATEGORIES: Category[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 430,
    targetGoal: 1000,
    color: 'emerald',
    icon: 'wallet',
  },
  {
    id: 'c-savings',
    name: 'Ahorro',
    currentBalance: 1700,
    targetGoal: 5000,
    color: 'violet',
    icon: 'savings',
  },
  {
    id: 'c-investment',
    name: 'Inversión',
    currentBalance: 800,
    color: 'amber',
    icon: 'investment',
  },
];

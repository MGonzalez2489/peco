import {Account} from '../models/account.model';

export const SEED_ACCOUNTS: Account[] = [
  {
    id: 'c-cash',
    name: 'Efectivo',
    currentBalance: 430,
    targetGoal: 1000,
    color: 'emerald',
    icon: 'wallet',
    pinToHome: true,
    isRoot: true,
  },
  {
    id: 'c-savings',
    name: 'Ahorro',
    currentBalance: 1700,
    targetGoal: 5000,
    color: 'violet',
    icon: 'savings',
    pinToHome: true,
  },
  {
    id: 'c-investment',
    name: 'Inversión',
    currentBalance: 800,
    color: 'amber',
    icon: 'investment',
  },
];

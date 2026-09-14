import {Category} from '../models/category.model';

export const SEED_CATEGORIES: Category[] = [
  {id: 'payroll', name: 'payroll', displayName: 'Nómina', icon: '💵', applyType: 'INCOME'},
  {id: 'services', name: 'services', displayName: 'Servicios', icon: '💡', applyType: 'EXPENSE'},
  {id: 'car', name: 'car', displayName: 'Auto', icon: '🚗', applyType: 'EXPENSE'},
  {id: 'kids', name: 'kids', displayName: 'Hijos', icon: '👶', applyType: 'EXPENSE'},
  {id: 'debts', name: 'debts', displayName: 'Deudas', icon: '💳', applyType: 'EXPENSE'},
  {id: 'gifts', name: 'gifts', displayName: 'Regalos', icon: '🎁', applyType: 'BOTH'},
  {id: 'donations', name: 'donations', displayName: 'Donaciones', icon: '🤲', applyType: 'BOTH'},
  {
    id: 'transfer',
    name: 'transfer',
    displayName: 'Transferencia',
    icon: '🔄',
    applyType: 'TRANSFER',
  },
];

import type {CategoryApplyType} from '@peco/contracts';
import {CategoryApplyTypeEnum} from '@peco/enums';

interface SystemCategorySeed {
  readonly name: string;
  readonly displayName: string;
  readonly icon: string;
  readonly color: string;
  readonly applyType: CategoryApplyType;
  readonly isRoot: boolean;
  readonly isSystem: boolean;
}

/** The global catalog seeded once at deployment; mirrors the web seed until phase 2 (8.9/US-402). */
export const SYSTEM_CATEGORY_SEED: readonly SystemCategorySeed[] = [
  {
    name: 'unknown',
    displayName: 'Otros',
    icon: 'folder-open',
    color: '#6B7280',
    applyType: CategoryApplyTypeEnum.BOTH.toString(),
    isRoot: true,
    isSystem: false,
  },
  {
    name: 'payroll',
    displayName: 'Nómina',
    icon: 'banknote',
    color: '#10B981',
    applyType: CategoryApplyTypeEnum.INCOME.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'services',
    displayName: 'Servicios',
    icon: 'zap',
    color: '#F59E0B',
    applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'car',
    displayName: 'Auto',
    icon: 'car',
    color: '#3B82F6',
    applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'kids',
    displayName: 'Hijos',
    icon: 'baby',
    color: '#EC4899',
    applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'debts',
    displayName: 'Deudas',
    icon: 'credit-card',
    color: '#EF4444',
    applyType: CategoryApplyTypeEnum.EXPENSE.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'gifts',
    displayName: 'Regalos',
    icon: 'gift',
    color: '#8B5CF6',
    applyType: CategoryApplyTypeEnum.BOTH.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'donations',
    displayName: 'Donaciones',
    icon: 'heart-handshake',
    color: '#14B8A6',
    applyType: CategoryApplyTypeEnum.BOTH.toString(),
    isRoot: false,
    isSystem: false,
  },
  {
    name: 'transfer',
    displayName: 'Transferencia',
    icon: 'arrow-left-right',
    color: '#6366F1',
    applyType: CategoryApplyTypeEnum.TRANSFER.toString(),
    isRoot: false,
    isSystem: true,
  },
  {
    name: 'adjustment',
    displayName: 'Ajuste de Saldo',
    icon: 'scale',
    color: '#64748B',
    applyType: CategoryApplyTypeEnum.BOTH.toString(),
    isRoot: false,
    isSystem: true,
  },
];

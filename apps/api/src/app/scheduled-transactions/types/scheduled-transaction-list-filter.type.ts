import type {ScheduledTransactionType} from '@peco/contracts';

/** Fully resolved period position and owner-scoped filters for schedule pages (8.11). */
export interface ScheduledTransactionListFilter {
  userId: number;
  periodFrom: string;
  periodTo: string;
  periodPosition: 'past' | 'current' | 'future';
  type?: ScheduledTransactionType;
  active?: boolean;
  autoApply?: boolean;
  accountPublicId?: string;
  search?: string;
}

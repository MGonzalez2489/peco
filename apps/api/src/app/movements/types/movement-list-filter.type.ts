import type {AccountType, MovementType} from '@peco/contracts';

/** Fully resolved, owner-scoped filter shared by the page and totals queries (D38). */
export interface MovementListFilter {
  userId: number;
  from: string | null;
  to: string | null;
  type: MovementType | null;
  accountPublicId: string | null;
  categoryPublicId: string | null;
  accountType: AccountType | null;
  note: string | null;
  excludeReversals: boolean;
  includeCanceled: boolean;
}

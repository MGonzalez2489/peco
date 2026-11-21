import type {AccountType} from './account-type.type';
import type {CategoryApplyType} from './category-apply-type.type';
import type {MovementType} from './movement-type.type';

interface MovementAccountSummary {
  publicId: string;
  name: string;
  type: AccountType;
  color: string | null;
  icon: string | null;
}

interface MovementCategorySummary {
  publicId: string;
  name: string;
  displayName: string;
  color: string | null;
  icon: string | null;
  applyType: CategoryApplyType;
}

/** Public ledger entry shape; internal ids never leave the API (8.9/US-305). */
export interface MovementResponse {
  publicId: string;
  type: MovementType;
  amount: number;
  date: string;
  note: string | null;
  account: MovementAccountSummary;
  targetAccount: MovementAccountSummary | null;
  category: MovementCategorySummary;
  isReversal: boolean;
  isReversed: boolean;
  reversalOfPublicId: string | null;
  replacesPublicId: string | null;
  isCanceled: boolean;
  scheduledTransactionPublicId: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

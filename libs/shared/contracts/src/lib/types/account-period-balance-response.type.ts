import type {AccountType} from './account-type.type';

/** One frozen account row inside a closed period (8.12/11.3/D62). */
export interface AccountPeriodBalanceResponse {
  accountPublicId: string;
  accountName: string;
  accountType: AccountType;
  color: string | null;
  icon: string | null;
  initialBalance: number;
  finalBalance: number;
  totalTransactions: number;
  totalInflows: number;
  totalOutflows: number;
  totalTransfers: number;
}

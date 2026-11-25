import type {AccountProgressionAccount} from './account-progression-account.type';
import type {AccountProgressionCreditUsage} from './account-progression-credit-usage.type';
import type {AccountProgressionPoint} from './account-progression-point.type';

/** Owner-scoped monthly account balance series returned by `GET /reports/accounts/:publicId/progression` (8.13). */
export interface AccountProgressionResponse {
  period: string;
  account: AccountProgressionAccount;
  initialBalance: number;
  finalBalance: number;
  creditUsage: AccountProgressionCreditUsage | null;
  points: AccountProgressionPoint[];
}

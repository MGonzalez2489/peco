import type {AccountTypeSummary} from './account-type-summary.type';

/** Computed figures returned as `meta.summary` by `GET /accounts` (D65). */
export interface AccountSummary {
  totalBalance: number;
  availableBalance: number;
  liabilitiesBalance: number;
  typeSummaries: AccountTypeSummary[];
}

import type {ScheduledTransactionType} from './scheduled-transaction-type.type';

/** Accepted query for `GET /scheduled-transactions`; the API owns all defaults (8.11/US-602). */
export interface ListScheduledTransactionsQuery {
  period?: string;
  type?: ScheduledTransactionType;
  active?: boolean;
  autoApply?: boolean;
  accountPublicId?: string;
  search?: string;
  cursor?: string;
  limit: number;
}

import type {AccountType} from './account-type.type';

/** Embedded account identity returned by schedule responses (8.11). */
export interface ScheduledAccountSummary {
  publicId: string;
  name: string;
  type: AccountType;
  color: string | null;
  icon: string | null;
}

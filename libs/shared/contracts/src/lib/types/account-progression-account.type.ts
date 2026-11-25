import type {AccountType} from './account-type.type';

/** Public account identity attached to a progression response (8.13). */
export interface AccountProgressionAccount {
  publicId: string;
  name: string;
  type: AccountType;
  color: string | null;
  icon: string | null;
}

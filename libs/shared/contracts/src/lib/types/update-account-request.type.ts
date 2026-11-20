import type {AccountType} from './account-type.type';

/** Mutable account metadata for `PATCH /accounts/:publicId` (8.8/US-303). */
export interface UpdateAccountRequest {
  name?: string;
  type?: AccountType;
  includeInTotal?: boolean;
  targetGoal?: number | null;
  creditLimit?: number | null;
  color?: string | null;
  icon?: string | null;
  pinToHome?: boolean;
  note?: string | null;
  version?: number;
}

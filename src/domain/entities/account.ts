import { BaseEntity } from "./_base";
import { AccountType } from "./account-type";

export interface Account extends BaseEntity {
  name: string;
  balance: number;
  initialBalance: number;
  type: AccountType;
  isRoot: boolean;

  bank?: string;
  accountNumber?: string;
}

import { BaseEntity } from "./_base";
import { Account } from "./account";
import { EntryCategory } from "./EntryCategory";
import { EntryStatus } from "./EntryStatus";
import { EntryType } from "./EntryType";

export interface Entry extends BaseEntity {
  description: string;
  amount: number;
  category: EntryCategory;
  type: EntryType;
  account: Account;
  status: EntryStatus;
}

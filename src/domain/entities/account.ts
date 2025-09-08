import { BaseEntity } from "./_base";

export interface Account extends BaseEntity {
  name: string;
  balance: number;
  initialBalance: number;
  isRoot: boolean;

  bank?: string;
  accountNumber?: string;
}

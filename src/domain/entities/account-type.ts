import { BaseEntity } from "./_base";

export interface AccountType extends BaseEntity {
  name: string;
  displayName: string;
  icon: string;
  color: string;
}

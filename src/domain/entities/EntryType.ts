import { BaseEntity } from "./_base";

export interface EntryType extends BaseEntity {
  name: string;
  displayName: string;
  color: string;
}

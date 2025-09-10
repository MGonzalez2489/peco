import { BaseEntity } from "./_base";
import { EntryType } from "./EntryType";

export interface EntryCategory extends BaseEntity {
  name: string;
  parent?: EntryCategory;
  subCategories: EntryCategory[];
  isVisible: boolean;
  isDefault: boolean;
  icon: string;
  color: string;
  forType: EntryType;
}

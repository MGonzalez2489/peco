import {
  AccountType,
  EntryCategory,
  EntryType,
  EntryStatus,
} from "src/domain/entities";
import { create } from "zustand";

export interface CatalogsState {
  accountTypes: AccountType[];
  entryCategories: EntryCategory[];
  entryTypes: EntryType[];
  entryStatuses: EntryStatus[];

  load: () => Promise<void>;
}

export const useCatalogsStore = create<CatalogsState>()((set, get) => ({
  accountTypes: [],
  entryCategories: [],
  entryTypes: [],
  entryStatuses: [],

  load: async () => {},
}));

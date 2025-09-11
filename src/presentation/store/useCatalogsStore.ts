import {
  loadAccountTypes,
  loadEntryCategories,
  loadEntryStatuses,
  loadEntryTypes,
} from "@actions/catalogs";
import { SearchDto } from "@infrastructure/dtos/search.dto";
import {
  AccountType,
  EntryCategory,
  EntryStatus,
  EntryType,
} from "src/domain/entities";
import { create } from "zustand";

export interface CatalogsState {
  accountTypes: AccountType[];
  entryCategories: EntryCategory[];
  entryTypes: EntryType[];
  entryStatuses: EntryStatus[];

  loadCatalogs: () => Promise<void>;
}

export const useCatalogsStore = create<CatalogsState>()((set, get) => ({
  accountTypes: [],
  entryCategories: [],
  entryTypes: [],
  entryStatuses: [],

  loadCatalogs: async () => {
    const search = new SearchDto();
    search.showAll = true;

    const [accountTypes, entryCategories, entryStatuses, entryTypes] =
      await Promise.all([
        loadAccountTypes(search),
        loadEntryCategories(search),
        loadEntryStatuses(search),
        loadEntryTypes(search),
      ]);

    set({
      accountTypes,
      entryCategories,
      entryStatuses,
      entryTypes,
    });
  },
}));

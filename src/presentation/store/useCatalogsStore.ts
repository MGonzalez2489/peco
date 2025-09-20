import {
  loadAccountTypes,
  loadEntryCategories,
  loadEntryStatuses,
  loadEntryTypes,
} from '@actions/catalogs';
import { SearchDto } from '@infrastructure/dtos/search.dto';
import { getIconComponent } from '@infrastructure/utils';
import { AccountType, EntryCategory, EntryStatus, EntryType } from 'src/domain/entities';
import { create } from 'zustand';

export interface CatalogsState {
  accountTypes: AccountType[];
  entryCategories: EntryCategory[];
  groupedEntryCategories: EntryCategory[];
  entryTypes: EntryType[];
  entryStatuses: EntryStatus[];

  loadCatalogs: () => Promise<void>;
}

export const useCatalogsStore = create<CatalogsState>()((set, get) => ({
  accountTypes: [],
  entryCategories: [],
  entryTypes: [],
  entryStatuses: [],
  groupedEntryCategories: [],

  loadCatalogs: async () => {
    const search = new SearchDto();
    search.showAll = true;

    const [accountTypes, entryCategories, entryStatuses, entryTypes] = await Promise.all([
      loadAccountTypes(search),
      loadEntryCategories(search),
      loadEntryStatuses(search),
      loadEntryTypes(search),
    ]);

    //account types
    accountTypes.map((f) => (f.iconItem = getIconComponent(f.icon))); // 1. Filtrar las categorías padre

    const parentCats = entryCategories.filter((f) => !f.parent); // 2. Asignar las subcategorías a los padres de forma segura
    parentCats.map(
      (f) => (f.subCategories = entryCategories.filter((g) => g.parent?.publicId === f.publicId))
    );

    set({
      accountTypes,
      entryCategories,
      groupedEntryCategories: parentCats,
      entryStatuses,
      entryTypes,
    });
  },
}));

import { Entry } from "@domain/entities";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

export interface EntryState {
  ids: string[];
  entries: Entry[];
  loadEntries: () => Promise<Entry[]>;
}

export const useEntryStore = create<EntryState>()(
  devtools((set, get) => ({
    ids: [],
    entries: [],
    loadEntries: async () => {},
  })),
);

import { Entry } from "@domain/entities";
import { GroupedEntriesDto } from "@infrastructure/dtos/entries";

export const groupEntriesByDate = (entries: Entry[]): GroupedEntriesDto[] => {
  if (!entries || entries.length === 0) {
    return [];
  }

  const groupedMap = entries.reduce((acc, entry) => {
    const date = new Date(entry.createdAt).toDateString(); // "Thu Sep 12 2025"
    if (!acc.has(date)) {
      acc.set(date, []);
    }
    acc.get(date)?.push(entry);
    return acc;
  }, new Map<string, Entry[]>());

  return Array.from(groupedMap, ([date, entries]) => ({
    date,
    entries,
  }));
};

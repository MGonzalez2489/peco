/**
 * Case-insensitive "contains" match between a movement note and the filter
 * query. An empty query always matches, and movements without a note only
 * match when the query is empty.
 */
export const matchesNoteQuery = (note: string | undefined, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return (note ?? '').toLowerCase().includes(normalizedQuery);
};

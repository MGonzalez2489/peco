const sort = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sort);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = sort((value as Record<string, unknown>)[key]);
        return result;
      }, {});
  }

  return value;
};

/** Deterministic serialization so object key order never changes a request hash. */
export const canonicalJson = (value: unknown): string => JSON.stringify(sort(value) ?? null);

import {ValueTransformer} from 'typeorm';

const normalize = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new TypeError(`Expected a safe integer value, received ${String(value)}`);
  }
  return parsed;
};

/** Keeps BIGINT identifiers and generated keys as numbers inside the application. */
export const numberTransformer: ValueTransformer = {
  to: normalize,
  from: normalize,
};

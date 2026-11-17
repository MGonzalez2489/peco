import {ValueTransformer} from 'typeorm';

const normalize = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  throw new TypeError(`Expected a string value, received ${typeof value}`);
};

/** The only serializer/deserializer for string-backed UTC timestamps and identifiers. */
export const stringTransformer: ValueTransformer = {
  to: normalize,
  from: normalize,
};

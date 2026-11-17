import {ColumnOptions} from 'typeorm';
import {numberTransformer} from '../transformers/number.transformer';

/** Signed BIGINT used for integer cents and identifiers (M6). */
export const BIGINT_COLUMN: ColumnOptions = {
  type: 'bigint',
  transformer: numberTransformer,
};

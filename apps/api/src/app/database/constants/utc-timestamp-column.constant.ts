import {ColumnOptions} from 'typeorm';
import {stringTransformer} from '../transformers/string.transformer';

/** Shared mapping for application-written UTC ISO-8601 strings (D8). */
export const UTC_TIMESTAMP_COLUMN: ColumnOptions = {
  type: 'varchar',
  length: 24,
  charset: 'ascii',
  collation: 'ascii_bin',
  transformer: stringTransformer,
};

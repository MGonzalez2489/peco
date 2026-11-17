import {ColumnOptions} from 'typeorm';

/** Enums are TypeScript unions stored as VARCHAR(20), never MySQL ENUM (D14). */
export const ENUM_COLUMN: ColumnOptions = {
  type: 'varchar',
  length: 20,
};

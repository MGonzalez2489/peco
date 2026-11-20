import type {UserDataExport} from '@peco/contracts';

/** Wire format version stamped into every export document (D73). */
export const USER_DATA_EXPORT_SCHEMA_VERSION: UserDataExport['schemaVersion'] = 1;

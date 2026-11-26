import {stringEnumValue} from './string-enum-value';

/** Stable alert rule names emitted by the API and evaluated by the platform (13.2/D71). */
export const AlertRuleEnum = {
  RECONCILIATION_DRIFT: stringEnumValue('RECONCILIATION_DRIFT'),
  SNAPSHOT_CHAIN_MISMATCH: stringEnumValue('SNAPSHOT_CHAIN_MISMATCH'),
  JOB_STALE: stringEnumValue('JOB_STALE'),
  HTTP_5XX_RATE: stringEnumValue('HTTP_5XX_RATE'),
  HTTP_P95: stringEnumValue('HTTP_P95'),
  DB_POOL_SATURATION: stringEnumValue('DB_POOL_SATURATION'),
} as const;

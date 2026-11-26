import {stringEnumValue} from './string-enum-value';

/** Stable Prometheus metric names exposed by `/metrics` (13.2/US-1002). */
export const MetricNameEnum = {
  HTTP_REQUEST_DURATION_SECONDS: stringEnumValue('http_request_duration_seconds'),
  HTTP_REQUESTS_TOTAL: stringEnumValue('http_requests_total'),
  JOB_RUN_DURATION_SECONDS: stringEnumValue('job_run_duration_seconds'),
  JOB_PROCESSED_USERS_TOTAL: stringEnumValue('job_processed_users_total'),
  OCCURRENCES_APPLIED_TOTAL: stringEnumValue('occurrences_applied_total'),
  OCCURRENCES_SKIPPED_TOTAL: stringEnumValue('occurrences_skipped_total'),
  OCCURRENCES_FAILED_TOTAL: stringEnumValue('occurrences_failed_total'),
  PERIODS_CLOSED_TOTAL: stringEnumValue('periods_closed_total'),
  RECONCILIATION_DRIFT_TOTAL: stringEnumValue('reconciliation_drift_total'),
  SNAPSHOT_CHAIN_MISMATCH_TOTAL: stringEnumValue('snapshot_chain_mismatch_total'),
  DB_POOL_IN_USE: stringEnumValue('db_pool_in_use'),
} as const;

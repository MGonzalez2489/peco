import {MetricNameEnum} from '@peco/enums';

/** Counter incremented once per drifted account found by the nightly job (US-510). */
export const RECONCILIATION_DRIFT_METRIC = MetricNameEnum.RECONCILIATION_DRIFT_TOTAL.toString();

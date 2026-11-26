import {stringEnumValue} from './string-enum-value';

/** Prometheus metric families supported by the in-memory registry (13.2/US-1002). */
export const MetricTypeEnum = {
  COUNTER: stringEnumValue('counter'),
  GAUGE: stringEnumValue('gauge'),
  HISTOGRAM: stringEnumValue('histogram'),
} as const;

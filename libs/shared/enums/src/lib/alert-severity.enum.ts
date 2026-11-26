import {stringEnumValue} from './string-enum-value';

/** Alert severities understood by the platform alert rules (13.2/D71). */
export const AlertSeverityEnum = {
  PAGE: stringEnumValue('PAGE'),
  WARN: stringEnumValue('WARN'),
  INFO: stringEnumValue('INFO'),
} as const;

import {stringEnumValue} from './string-enum-value';

/** Result of rotating one refresh token (D22/US-203). */
export const RefreshRotationStatusEnum = {
  ROTATED: stringEnumValue('rotated'),
  EXPIRED: stringEnumValue('expired'),
  REUSED: stringEnumValue('reused'),
  INVALID: stringEnumValue('invalid'),
} as const;

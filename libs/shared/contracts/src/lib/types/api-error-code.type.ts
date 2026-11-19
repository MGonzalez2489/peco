import type {ApiErrorCodeEnum, StringEnumValues} from '@peco/enums';

/**
 * Stable, English error codes returned in `{error.code}` (8.3).
 * The Spanish user-facing message travels in `{error.message}`.
 */
export type ApiErrorCode = StringEnumValues<typeof ApiErrorCodeEnum>;

import type {AccountTypeEnum, StringEnumValues} from '@peco/enums';

/** Kind of account. Only `CREDIT` may hold a negative balance. */
export type AccountType = StringEnumValues<typeof AccountTypeEnum>;

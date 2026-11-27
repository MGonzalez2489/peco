import type {AccountTypeEnum, StringEnumValues} from '@peco/enums';

/** Account type derived from the shared enum registry. */
export type AccountType = StringEnumValues<typeof AccountTypeEnum>;

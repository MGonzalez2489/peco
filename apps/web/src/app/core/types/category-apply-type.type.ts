import type {CategoryApplyTypeEnum, StringEnumValues} from '@peco/enums';

/** Category applicability derived from the shared enum registry. */
export type CategoryApplyType = StringEnumValues<typeof CategoryApplyTypeEnum>;

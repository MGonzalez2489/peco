import type {MovementTypeEnum, StringEnumValues} from '@peco/enums';

/** Movement direction derived from the shared enum registry. */
export type MovementType = StringEnumValues<typeof MovementTypeEnum>;

import type {MovementTypeEnum, StringEnumValues} from '@peco/enums';

/** Direction of a movement; the amount itself is always a positive magnitude. */
export type MovementType = StringEnumValues<typeof MovementTypeEnum>;

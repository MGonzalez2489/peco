import type {AppThemeEnum, StringEnumValues} from '@peco/enums';

/** Theme selection derived from the shared enum registry. */
export type AppTheme = StringEnumValues<typeof AppThemeEnum>;

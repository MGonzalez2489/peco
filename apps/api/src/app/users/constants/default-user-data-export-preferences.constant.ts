import type {UserDataExport} from '@peco/contracts';
import {AppThemeEnum} from '@peco/enums';

/** Fallback used when a user has no active preferences row (US-901). */
export const DEFAULT_USER_DATA_EXPORT_PREFERENCES: Omit<
  UserDataExport['preferences'],
  'updatedAt'
> = {
  theme: AppThemeEnum.LIGHT.toString(),
  pwaBannerDismissedAt: null,
  accounts: {hideBalance: false},
  movements: {hideReversal: true},
};

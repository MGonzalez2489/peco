import {UserPreferences} from '../models/user-preferences.model';
import {AppThemeEnum} from '@peco/enums';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: AppThemeEnum.LIGHT.toString(),
  pwaBannerDismissedAt: null,
  accounts: {
    hideBalance: false,
  },
  movements: {
    // Reversals are hidden by default to keep the movement history clean.
    hideReversal: true,
  },
};

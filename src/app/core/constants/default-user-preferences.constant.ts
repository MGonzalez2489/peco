import {UserPreferences} from '../models/user-preferences.model';

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  pwaBannerDismissedAt: null,
  accounts: {
    hideBalance: false,
  },
  movements: {
    // Reversals are hidden by default to keep the movement history clean.
    hideReversal: true,
  },
};

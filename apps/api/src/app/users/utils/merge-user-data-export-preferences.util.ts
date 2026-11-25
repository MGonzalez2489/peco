import type {UserDataExport} from '@peco/contracts';
import type {UserPreferencesEntity} from '../../database/entities';
import {DEFAULT_USER_DATA_EXPORT_PREFERENCES} from '../constants/default-user-data-export-preferences.constant';

type StoredPreferences = Pick<
  UserPreferencesEntity,
  'theme' | 'pwaBannerDismissedAt' | 'hideBalance' | 'hideReversal'
>;

type MergedPreferences = Omit<UserDataExport['preferences'], 'updatedAt'>;

/**
 * Rebuilds the public preference shape from a stored row and canonical defaults.
 * Only known fields are copied, so rows written before a new field existed keep
 * working and unknown stored fields never leak into the response (US-902).
 */
export const mergeUserDataExportPreferences = (
  value: StoredPreferences | null,
): MergedPreferences => ({
  ...DEFAULT_USER_DATA_EXPORT_PREFERENCES,
  theme: value?.theme ?? DEFAULT_USER_DATA_EXPORT_PREFERENCES.theme,
  pwaBannerDismissedAt:
    value?.pwaBannerDismissedAt ?? DEFAULT_USER_DATA_EXPORT_PREFERENCES.pwaBannerDismissedAt,
  accounts: {
    ...DEFAULT_USER_DATA_EXPORT_PREFERENCES.accounts,
    hideBalance: value?.hideBalance ?? DEFAULT_USER_DATA_EXPORT_PREFERENCES.accounts.hideBalance,
  },
  movements: {
    ...DEFAULT_USER_DATA_EXPORT_PREFERENCES.movements,
    hideReversal: value?.hideReversal ?? DEFAULT_USER_DATA_EXPORT_PREFERENCES.movements.hideReversal,
  },
});

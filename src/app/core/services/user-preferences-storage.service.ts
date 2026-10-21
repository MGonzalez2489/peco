import {Injectable} from '@angular/core';
import {DEFAULT_USER_PREFERENCES} from '../constants/default-user-preferences.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {AccountPreferences} from '../models/account-preferences.model';
import {MovementPreferences} from '../models/movement-preferences.model';
import {UserPreferences} from '../models/user-preferences.model';
import {AppTheme} from '../types/app-theme.type';

const APP_THEMES: readonly AppTheme[] = ['light', 'dark', 'system'];

@Injectable({providedIn: 'root'})
export class UserPreferencesStorageService {
  load(): UserPreferences {
    this.migrateLegacyPreferences();

    const stored = this.readStoredPreferences();

    return {
      theme: stored.theme,
      pwaBannerDismissedAt: stored.pwaBannerDismissedAt,
      accounts: stored.accounts,
      movements: stored.movements,
    };
  }

  save(preferences: UserPreferences): void {
    localStorage.setItem(LOCAL_STORAGE_KEYS.userPreferences, JSON.stringify(preferences));
  }

  /**
   * Consolidates the deprecated `peco.theme` and `peco.pwa-banner-dismissed-at`
   * keys into the single `peco.user-preferences` object and removes them.
   */
  private migrateLegacyPreferences(): void {
    const legacyTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.themeLegacy);
    const legacyDismissedAt = localStorage.getItem(LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy);

    if (legacyTheme === null && legacyDismissedAt === null) {
      return;
    }

    const current = this.readStoredPreferences();
    const migrated: UserPreferences = {
      theme: legacyTheme !== null ? normalizeTheme(legacyTheme) : current.theme,
      pwaBannerDismissedAt:
        legacyDismissedAt !== null
          ? normalizeDismissedAt(legacyDismissedAt)
          : current.pwaBannerDismissedAt,
      accounts: current.accounts,
      movements: current.movements,
    };

    this.save(migrated);

    if (legacyTheme !== null) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.themeLegacy);
    }
    if (legacyDismissedAt !== null) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy);
    }
  }

  private readStoredPreferences(): UserPreferences {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences);
    if (raw === null) {
      return cloneDefaultPreferences();
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      return mergeWithDefaults(parsed);
    } catch {
      return cloneDefaultPreferences();
    }
  }
}

/**
 * Returns a deep copy of the defaults so the shared constant is never mutated
 * by the store when it commits a partial update.
 */
const cloneDefaultPreferences = (): UserPreferences => ({
  ...DEFAULT_USER_PREFERENCES,
  accounts: {...DEFAULT_USER_PREFERENCES.accounts},
  movements: {...DEFAULT_USER_PREFERENCES.movements},
});

const normalizeTheme = (raw: string): AppTheme =>
  APP_THEMES.includes(raw as AppTheme) ? (raw as AppTheme) : DEFAULT_USER_PREFERENCES.theme;

/**
 * Legacy dismissals were persisted as epoch milliseconds, while the current
 * format is an ISO-8601 timestamp. Both formats are normalized to ISO.
 */
const normalizeDismissedAt = (raw: string): string | null => {
  const numeric = Number(raw);
  const timestamp = Number.isFinite(numeric) && numeric > 0 ? numeric : Date.parse(raw);

  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
};

const mergeWithDefaults = (value: unknown): UserPreferences => {
  if (typeof value !== 'object' || value === null) {
    return cloneDefaultPreferences();
  }

  const candidate = value as Partial<UserPreferences> & {accounts?: unknown; movements?: unknown};

  return {
    theme: typeof candidate.theme === 'string' ? normalizeTheme(candidate.theme) : DEFAULT_USER_PREFERENCES.theme,
    pwaBannerDismissedAt:
      typeof candidate.pwaBannerDismissedAt === 'string'
        ? normalizeDismissedAt(candidate.pwaBannerDismissedAt)
        : null,
    accounts: mergeAccountsWithDefaults(candidate.accounts),
    movements: mergeMovementsWithDefaults(candidate.movements),
  };
};

/**
 * Backward compatibility: payloads persisted before the `accounts` section
 * existed are merged with the default account preferences instead of throwing.
 */
const mergeAccountsWithDefaults = (value: unknown): AccountPreferences => {
  if (typeof value !== 'object' || value === null) {
    return {...DEFAULT_USER_PREFERENCES.accounts};
  }

  const candidate = value as Partial<AccountPreferences>;

  return {
    hideBalance:
      typeof candidate.hideBalance === 'boolean'
        ? candidate.hideBalance
        : DEFAULT_USER_PREFERENCES.accounts.hideBalance,
  };
};

/**
 * Backward compatibility: payloads persisted before the `movements` section
 * existed are merged with the default movement preferences instead of throwing.
 */
const mergeMovementsWithDefaults = (value: unknown): MovementPreferences => {
  if (typeof value !== 'object' || value === null) {
    return {...DEFAULT_USER_PREFERENCES.movements};
  }

  const candidate = value as Partial<MovementPreferences>;

  return {
    hideReversal:
      typeof candidate.hideReversal === 'boolean'
        ? candidate.hideReversal
        : DEFAULT_USER_PREFERENCES.movements.hideReversal,
  };
};

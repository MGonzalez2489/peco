import {computed, inject} from '@angular/core';
import {withDevtools} from '@angular-architects/ngrx-toolkit';
import {patchState, signalStore, withComputed, withHooks, withMethods, withState} from '@ngrx/signals';
import {DEFAULT_USER_PREFERENCES} from '../constants/default-user-preferences.constant';
import {AccountPreferences} from '../models/account-preferences.model';
import {MovementPreferences} from '../models/movement-preferences.model';
import {UserPreferences} from '../models/user-preferences.model';
import {UserPreferencesStorageService} from '../services/user-preferences-storage.service';
import {AppTheme} from '../types/app-theme.type';

interface UserPreferencesState {
  preferences: UserPreferences;
  isLoading: boolean;
}

const INITIAL_STATE: UserPreferencesState = {
  preferences: DEFAULT_USER_PREFERENCES,
  isLoading: false,
};

const SYSTEM_DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

const isSystemDark = (): boolean => window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).matches;

const applyThemeToDocument = (theme: AppTheme): void => {
  const isDark = theme === 'dark' || (theme === 'system' && isSystemDark());
  document.documentElement.classList.toggle('dark', isDark);
};

export const UserPreferencesStore = signalStore(
  {providedIn: 'root'},
  withState(INITIAL_STATE),
  withComputed(({preferences}) => ({
    theme: computed(() => preferences().theme),
    pwaBannerDismissedAt: computed(() => preferences().pwaBannerDismissedAt),
    isPwaBannerDismissed: computed(() => !!preferences().pwaBannerDismissedAt),
    accountsPreferences: computed(() => preferences().accounts),
    hideBalance: computed(() => preferences().accounts.hideBalance),
    movementPreferences: computed(() => preferences().movements),
    hideReversal: computed(() => preferences().movements.hideReversal),
  })),
  withMethods((store) => {
    const storage = inject(UserPreferencesStorageService);

    const commit = (changes: Partial<UserPreferences>): void => {
      const preferences: UserPreferences = {...store.preferences(), ...changes};
      patchState(store, {preferences});
      storage.save(preferences);
    };

    const updateAccountPreferences = (partial: Partial<AccountPreferences>): void => {
      const accounts: AccountPreferences = {...store.accountsPreferences(), ...partial};
      commit({accounts});
    };

    const updateMovementPreferences = (partial: Partial<MovementPreferences>): void => {
      const movements: MovementPreferences = {...store.movementPreferences(), ...partial};
      commit({movements});
    };

    return {
      loadPreferences(): void {
        patchState(store, {isLoading: true});
        const preferences = storage.load();
        patchState(store, {preferences, isLoading: false});
        applyThemeToDocument(preferences.theme);
      },
      setTheme(theme: AppTheme): void {
        commit({theme});
        applyThemeToDocument(theme);
      },
      dismissPwaBanner(): void {
        commit({pwaBannerDismissedAt: new Date().toISOString()});
      },
      updatePreferences(changes: Partial<UserPreferences>): void {
        commit(changes);
        applyThemeToDocument(store.theme());
      },
      updateAccountPreferences,
      toggleHideBalance(): void {
        updateAccountPreferences({hideBalance: !store.hideBalance()});
      },
      updateMovementPreferences,
      toggleHideReversal(): void {
        updateMovementPreferences({hideReversal: !store.hideReversal()});
      },
    };
  }),
  withHooks({
    onInit(store) {
      store.loadPreferences();

      window.matchMedia(SYSTEM_DARK_MEDIA_QUERY).addEventListener('change', () => {
        applyThemeToDocument(store.theme());
      });
    },
  }),
  withDevtools('UserPreferencesStore'),
);

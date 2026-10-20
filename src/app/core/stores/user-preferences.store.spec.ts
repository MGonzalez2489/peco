import {TestBed} from '@angular/core/testing';
import {DEFAULT_USER_PREFERENCES} from '../constants/default-user-preferences.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {UserPreferencesStore} from './user-preferences.store';

describe('UserPreferencesStore', () => {
  let store: InstanceType<typeof UserPreferencesStore>;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    TestBed.configureTestingModule({providers: [UserPreferencesStore]});
    store = TestBed.inject(UserPreferencesStore);
  });

  afterEach(() => {
    document.documentElement.classList.remove('dark');
  });

  it('starts with the default preferences', () => {
    expect(store.preferences()).toEqual(DEFAULT_USER_PREFERENCES);
    expect(store.theme()).toBe('light');
    expect(store.isPwaBannerDismissed()).toBe(false);
    expect(store.isLoading()).toBe(false);
  });

  it('loads preferences from storage and consolidates legacy keys on init', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.themeLegacy, 'dark');
    localStorage.setItem(LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy, '1700000000000');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [UserPreferencesStore]});
    const migrated = TestBed.inject(UserPreferencesStore);

    expect(migrated.theme()).toBe('dark');
    expect(migrated.isPwaBannerDismissed()).toBe(true);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.themeLegacy)).toBe(null);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy)).toBe(null);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists the theme immediately and applies the dark class', () => {
    store.setTheme('dark');

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences) ?? '{}');
    expect(stored.theme).toBe('dark');
    expect(store.theme()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes the dark class when switching back to the light theme', () => {
    store.setTheme('dark');
    store.setTheme('light');

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('records an ISO timestamp when the pwa banner is dismissed', () => {
    store.dismissPwaBanner();

    const dismissedAt = store.pwaBannerDismissedAt();
    expect(dismissedAt).not.toBe(null);
    expect(new Date(dismissedAt ?? '').toISOString()).toBe(dismissedAt);
    expect(store.isPwaBannerDismissed()).toBe(true);

    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences) ?? '{}');
    expect(stored.pwaBannerDismissedAt).toBe(dismissedAt);
  });

  it('updates arbitrary preferences through updatePreferences', () => {
    store.updatePreferences({theme: 'system'});

    expect(store.theme()).toBe('system');
    const stored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences) ?? '{}');
    expect(stored.theme).toBe('system');
    expect(stored.pwaBannerDismissedAt).toBe(null);
  });
});

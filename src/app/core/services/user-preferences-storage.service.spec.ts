import {TestBed} from '@angular/core/testing';
import {DEFAULT_USER_PREFERENCES} from '../constants/default-user-preferences.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {UserPreferences} from '../models/user-preferences.model';
import {UserPreferencesStorageService} from './user-preferences-storage.service';

describe('UserPreferencesStorageService', () => {
  let service: UserPreferencesStorageService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({providers: [UserPreferencesStorageService]});
    service = TestBed.inject(UserPreferencesStorageService);
  });

  it('returns the default preferences when nothing is stored', () => {
    expect(service.load()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('round trips the preferences object under the standardized key', () => {
    const preferences: UserPreferences = {
      theme: 'dark',
      pwaBannerDismissedAt: null,
      accounts: {hideBalance: false},
    };

    service.save(preferences);

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences)).toBe(
      JSON.stringify(preferences),
    );
    expect(service.load()).toEqual(preferences);
  });

  it('consolidates the legacy theme and pwa banner keys and removes them', () => {
    const dismissedAt = 1_700_000_000_000;
    localStorage.setItem(LOCAL_STORAGE_KEYS.themeLegacy, 'dark');
    localStorage.setItem(LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy, String(dismissedAt));

    const loaded = service.load();

    expect(loaded.theme).toBe('dark');
    expect(loaded.pwaBannerDismissedAt).toBe(new Date(dismissedAt).toISOString());
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.themeLegacy)).toBe(null);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy)).toBe(null);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.userPreferences)).not.toBe(null);
  });

  it('keeps consolidated values for fields without a legacy counterpart', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({
        theme: 'system',
        pwaBannerDismissedAt: null,
        accounts: {hideBalance: false},
      } satisfies UserPreferences),
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.themeLegacy, 'dark');

    const loaded = service.load();

    expect(loaded.theme).toBe('dark');
    expect(loaded.pwaBannerDismissedAt).toBe(null);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.themeLegacy)).toBe(null);
  });

  it('falls back to defaults when the stored payload is corrupted', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.userPreferences, '{not-json');

    expect(service.load()).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('normalizes unknown themes and invalid timestamps', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'neon', pwaBannerDismissedAt: 'not-a-date'}),
    );

    const loaded = service.load();

    expect(loaded.theme).toBe(DEFAULT_USER_PREFERENCES.theme);
    expect(loaded.pwaBannerDismissedAt).toBe(null);
  });

  it('falls back to default account preferences when the accounts section is missing', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'dark', pwaBannerDismissedAt: null}),
    );

    const loaded = service.load();

    expect(loaded.accounts).toEqual(DEFAULT_USER_PREFERENCES.accounts);
    expect(loaded.theme).toBe('dark');
  });

  it('falls back to the default hideBalance when it is missing or invalid', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'dark', pwaBannerDismissedAt: null, accounts: {}}),
    );

    expect(service.load().accounts.hideBalance).toBe(false);

    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'dark', pwaBannerDismissedAt: null, accounts: {hideBalance: 'yes'}}),
    );

    expect(service.load().accounts.hideBalance).toBe(false);
  });

  it('preserves a stored hideBalance of true', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.userPreferences,
      JSON.stringify({theme: 'light', pwaBannerDismissedAt: null, accounts: {hideBalance: true}}),
    );

    expect(service.load().accounts.hideBalance).toBe(true);
  });
});

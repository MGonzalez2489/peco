import {Injectable, inject} from '@angular/core';
import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {APP_VERSION} from '../constants/app-version.constant';
import {DEFAULT_USER_PREFERENCES} from '../constants/default-user-preferences.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SEED_ACCOUNTS} from '../constants/seed-accounts.constant';
import {SEED_CATEGORIES} from '../constants/seed-categories.constant';
import {BackupData} from '../models/backup-data.model';
import {UserPreferences} from '../models/user-preferences.model';
import {UserPreferencesStore} from '../stores/user-preferences.store';
import {BackupImportSelection} from '../types/backup-import-selection.type';
import {buildBackupFilename} from '../utils/build-backup-filename.util';
import {isAppStorageKey} from '../utils/is-app-storage-key.util';
import {migrateBackupAmountsToCents} from '../utils/migrate-backup-amounts.util';

/**
 * Legacy preference keys persisted before the consolidated `peco.user-preferences`
 * object. They are still read on import so older backups keep their settings.
 */
const LEGACY_PREFERENCE_STORAGE_KEYS: readonly string[] = [
  LOCAL_STORAGE_KEYS.themeLegacy,
  LOCAL_STORAGE_KEYS.pwaBannerDismissedAtLegacy,
];

@Injectable({providedIn: 'root'})
export class DataBackupService {
  private readonly userPreferencesStore = inject(UserPreferencesStore);

  exportData(): void {
    const data: Record<string, unknown> = {};

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !isAppStorageKey(key)) continue;
      // Preferences are exported from the store instead, so they are always
      // complete and normalized regardless of what is cached in localStorage.
      if (key === LOCAL_STORAGE_KEYS.userPreferences) continue;
      data[key] = this.readValue(key);
    }

    // Always include the full user preferences object so a restored backup
    // carries the appearance and account preferences of the exported device.
    data[LOCAL_STORAGE_KEYS.userPreferences] = this.userPreferencesStore.preferences();

    const backup: BackupData = {
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    };

    const payload = JSON.stringify(backup, null, 2);
    const blob = new Blob([payload], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = buildBackupFilename(new Date());
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async importData(file: File, selection: BackupImportSelection): Promise<boolean> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return false;
    }

    if (!this.isBackupData(parsed)) return false;

    const keys = this.resolveImportKeys(selection);
    // Backups created before the cents schema still hold decimal amounts.
    const importedData = migrateBackupAmountsToCents(parsed.data);

    this.clearEntries(keys);

    for (const key of keys) {
      if (!(key in importedData)) continue;
      this.writeValue(key, importedData[key]);
    }

    // The payload was normalized to cents, so stamping the version prevents the
    // startup migration from converting it again after the reload.
    this.writeValue(LOCAL_STORAGE_KEYS.schemaVersion, AMOUNT_SCHEMA_VERSION);

    if (selection.preferences) {
      this.importPreferences(importedData);
    }

    window.location.reload();
    return true;
  }

  resetAllData(): void {
    this.clearAppEntries();

    this.writeValue(LOCAL_STORAGE_KEYS.accounts, SEED_ACCOUNTS);
    this.writeValue(LOCAL_STORAGE_KEYS.movements, []);
    this.writeValue(LOCAL_STORAGE_KEYS.categories, SEED_CATEGORIES);
    this.writeValue(LOCAL_STORAGE_KEYS.scheduledTransactions, []);
    this.writeValue(LOCAL_STORAGE_KEYS.userPreferences, DEFAULT_USER_PREFERENCES);
    this.writeValue(LOCAL_STORAGE_KEYS.schemaVersion, AMOUNT_SCHEMA_VERSION);

    window.location.reload();
  }

  private resolveImportKeys(selection: BackupImportSelection): string[] {
    const includeMovements = selection.movements && selection.accounts;
    const keys: string[] = [];

    if (selection.accounts) {
      keys.push(LOCAL_STORAGE_KEYS.accounts, LOCAL_STORAGE_KEYS.accountsLegacy);
    }
    if (includeMovements) {
      keys.push(LOCAL_STORAGE_KEYS.movements);
    }
    if (selection.accounts || includeMovements) {
      keys.push(LOCAL_STORAGE_KEYS.categories, LOCAL_STORAGE_KEYS.categoriesLegacy);
    }
    if (selection.scheduledTransactions) {
      keys.push(
        LOCAL_STORAGE_KEYS.scheduledTransactions,
        LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy,
      );
    }

    return [...new Set(keys)];
  }

  /**
   * Preferences are merged instead of cleared and are entirely skipped unless
   * the user opts in, so importing business data never silently overwrites the
   * look and privacy settings of the current device.
   *
   * Backups created before the consolidated key existed stored the legacy
   * `peco.theme` / `peco.pwa-banner-dismissed-at` keys; when only those are
   * present, they are restored so the settings survive the next startup.
   */
  private importPreferences(data: Record<string, unknown>): void {
    if (LOCAL_STORAGE_KEYS.userPreferences in data) {
      this.writeValue(
        LOCAL_STORAGE_KEYS.userPreferences,
        this.normalizeImportedPreferences(data[LOCAL_STORAGE_KEYS.userPreferences]),
      );
      return;
    }

    for (const key of LEGACY_PREFERENCE_STORAGE_KEYS) {
      if (!(key in data)) continue;
      this.writeValue(key, data[key]);
    }
  }

  /**
   * Merges an imported preferences payload with the current ones so partial or
   * outdated backups (missing sections such as `accounts` or `movements`)
   * restore cleanly.
   */
  private normalizeImportedPreferences(value: unknown): UserPreferences {
    const current = this.userPreferencesStore.preferences();

    if (typeof value !== 'object' || value === null) {
      return current;
    }

    const candidate = value as Partial<UserPreferences>;

    return {
      ...current,
      ...candidate,
      accounts: {...current.accounts, ...(candidate.accounts ?? {})},
      movements: {...current.movements, ...(candidate.movements ?? {})},
    };
  }

  private readValue(key: string): unknown {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  private writeValue(key: string, value: unknown): void {
    if (typeof value === 'string') {
      localStorage.setItem(key, value);
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private isBackupData(value: unknown): value is BackupData {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Partial<BackupData>;
    return (
      typeof candidate.version === 'string' &&
      typeof candidate.exportedAt === 'string' &&
      typeof candidate.data === 'object' &&
      candidate.data !== null &&
      !Array.isArray(candidate.data)
    );
  }

  private clearEntries(keys: readonly string[]): void {
    for (const key of keys) localStorage.removeItem(key);
  }

  private clearAppEntries(): void {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && isAppStorageKey(key)) keysToRemove.push(key);
    }
    this.clearEntries(keysToRemove);
  }
}

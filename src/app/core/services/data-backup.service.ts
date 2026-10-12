import {Injectable} from '@angular/core';
import {APP_VERSION} from '../constants/app-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SEED_ACCOUNTS} from '../constants/seed-accounts.constant';
import {SEED_CATEGORIES} from '../constants/seed-categories.constant';
import {BackupData} from '../models/backup-data.model';
import {BackupImportSelection} from '../types/backup-import-selection.type';
import {buildBackupFilename} from '../utils/build-backup-filename.util';
import {isAppStorageKey} from '../utils/is-app-storage-key.util';

@Injectable({providedIn: 'root'})
export class DataBackupService {
  exportData(): void {
    const data: Record<string, unknown> = {};

    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (!key || !isAppStorageKey(key)) continue;
      data[key] = this.readValue(key);
    }

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
    if (keys.length === 0) return true;

    this.clearEntries(keys);

    for (const key of keys) {
      if (!(key in parsed.data)) continue;
      this.writeValue(key, parsed.data[key]);
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
      keys.push(LOCAL_STORAGE_KEYS.scheduledTransactions);
    }

    return [...new Set(keys)];
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

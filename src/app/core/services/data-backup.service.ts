import {Injectable} from '@angular/core';
import {APP_VERSION} from '../constants/app-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {SEED_ACCOUNTS} from '../constants/seed-accounts.constant';
import {SEED_CATEGORIES} from '../constants/seed-categories.constant';
import {BackupData} from '../models/backup-data.model';
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

  async importData(file: File): Promise<boolean> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return false;
    }

    if (!this.isBackupData(parsed)) return false;

    this.clearAppEntries();

    for (const [key, value] of Object.entries(parsed.data)) {
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }

    window.location.reload();
    return true;
  }

  resetAllData(): void {
    this.clearAppEntries();

    localStorage.setItem(LOCAL_STORAGE_KEYS.accounts, JSON.stringify(SEED_ACCOUNTS));
    localStorage.setItem(LOCAL_STORAGE_KEYS.movements, JSON.stringify([]));
    localStorage.setItem(LOCAL_STORAGE_KEYS.categories, JSON.stringify(SEED_CATEGORIES));
    localStorage.setItem(LOCAL_STORAGE_KEYS.scheduledTransactions, JSON.stringify([]));

    window.location.reload();
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

  private clearAppEntries(): void {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key && isAppStorageKey(key)) keysToRemove.push(key);
    }
    for (const key of keysToRemove) localStorage.removeItem(key);
  }
}

import {Injectable} from '@angular/core';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {PeriodSnapshot} from '../models/period-snapshot.model';
import {migrateAmountsToCents} from '../utils/migrate-amounts-to-cents.util';
import {readStorageArray} from '../utils/read-storage-array.util';
import {writeStorageArray} from '../utils/write-storage-array.util';

@Injectable({providedIn: 'root'})
export class PeriodSnapshotsStorageService {
  constructor() {
    this.migrateLegacyKey();
    migrateAmountsToCents();
  }

  getAll(): PeriodSnapshot[] {
    return readStorageArray<PeriodSnapshot>(LOCAL_STORAGE_KEYS.periodSnapshots) ?? [];
  }

  saveAll(snapshots: PeriodSnapshot[]): void {
    writeStorageArray(LOCAL_STORAGE_KEYS.periodSnapshots, snapshots);
  }

  getByPeriod(period: string): PeriodSnapshot | undefined {
    return this.getAll().find((snapshot) => snapshot.period === period);
  }

  upsertSnapshot(snapshot: PeriodSnapshot): void {
    const snapshots = this.getAll();
    const exists = snapshots.some(
      (entry) => entry.id === snapshot.id || entry.period === snapshot.period,
    );

    this.saveAll(
      exists
        ? snapshots.map((entry) =>
            entry.id === snapshot.id || entry.period === snapshot.period ? snapshot : entry,
          )
        : [...snapshots, snapshot],
    );
  }

  /** Copies the early `peco_period_snapshots` payload into the standardized key. */
  private migrateLegacyKey(): void {
    const legacyRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshotsLegacy);
    if (legacyRaw === null) return;

    // The standardized key wins when both exist; otherwise copy the legacy payload over.
    const currentRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.periodSnapshots);
    if (currentRaw === null) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.periodSnapshots, legacyRaw);
    }

    localStorage.removeItem(LOCAL_STORAGE_KEYS.periodSnapshotsLegacy);
  }
}

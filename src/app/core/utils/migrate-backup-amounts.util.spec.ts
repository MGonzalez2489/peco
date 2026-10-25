import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {migrateBackupAmountsToCents} from './migrate-backup-amounts.util';

describe('migrateBackupAmountsToCents', () => {
  it('converts legacy decimal backups and stamps the schema version', () => {
    const data: Record<string, unknown> = {
      [LOCAL_STORAGE_KEYS.accounts]: [{currentBalance: 1500.5, targetGoal: 2000}],
      [LOCAL_STORAGE_KEYS.movements]: [{amount: 25.1}],
      [LOCAL_STORAGE_KEYS.scheduledTransactions]: [{estimatedAmount: 99.99}],
    };

    const result = migrateBackupAmountsToCents(data);

    expect(result[LOCAL_STORAGE_KEYS.accounts]).toEqual([
      {currentBalance: 150050, targetGoal: 200000},
    ]);
    expect(result[LOCAL_STORAGE_KEYS.movements]).toEqual([{amount: 2510}]);
    expect(result[LOCAL_STORAGE_KEYS.scheduledTransactions]).toEqual([{estimatedAmount: 9999}]);
    expect(result[LOCAL_STORAGE_KEYS.schemaVersion]).toBe(AMOUNT_SCHEMA_VERSION);
  });

  it('returns already-migrated backups untouched', () => {
    const data: Record<string, unknown> = {
      [LOCAL_STORAGE_KEYS.schemaVersion]: AMOUNT_SCHEMA_VERSION,
      [LOCAL_STORAGE_KEYS.accounts]: [{currentBalance: 150050}],
    };

    expect(migrateBackupAmountsToCents(data)).toBe(data);
  });

  it('accepts a numeric schema version produced by the export parser', () => {
    const data: Record<string, unknown> = {
      [LOCAL_STORAGE_KEYS.schemaVersion]: Number(AMOUNT_SCHEMA_VERSION),
      [LOCAL_STORAGE_KEYS.accounts]: [{currentBalance: 150050}],
    };

    expect(migrateBackupAmountsToCents(data)).toBe(data);
  });

  it('preserves keys and entries it does not understand', () => {
    const data: Record<string, unknown> = {
      [LOCAL_STORAGE_KEYS.accounts]: 'not-an-array',
      [LOCAL_STORAGE_KEYS.categories]: [{id: 'unknown'}],
    };

    const result = migrateBackupAmountsToCents(data);

    expect(result[LOCAL_STORAGE_KEYS.accounts]).toBe('not-an-array');
    expect(result[LOCAL_STORAGE_KEYS.categories]).toEqual([{id: 'unknown'}]);
  });
});

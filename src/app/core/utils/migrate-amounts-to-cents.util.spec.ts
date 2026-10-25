import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {migrateAmountsToCents} from './migrate-amounts-to-cents.util';

const readJson = (key: string): unknown => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('migrateAmountsToCents', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('converts every amount-bearing key from decimal to cents', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.accounts,
      JSON.stringify([{id: 'a', currentBalance: 1500.5, targetGoal: 2000, creditLimit: 5000}]),
    );
    localStorage.setItem(LOCAL_STORAGE_KEYS.movements, JSON.stringify([{id: 'm', amount: 25.1}]));
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.scheduledTransactions,
      JSON.stringify([{id: 's', estimatedAmount: 99.99}]),
    );

    migrateAmountsToCents();

    expect(readJson(LOCAL_STORAGE_KEYS.accounts)).toEqual([
      {id: 'a', currentBalance: 150050, targetGoal: 200000, creditLimit: 500000},
    ]);
    expect(readJson(LOCAL_STORAGE_KEYS.movements)).toEqual([{id: 'm', amount: 2510}]);
    expect(readJson(LOCAL_STORAGE_KEYS.scheduledTransactions)).toEqual([
      {id: 's', estimatedAmount: 9999},
    ]);
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.schemaVersion)).toBe(AMOUNT_SCHEMA_VERSION);
  });

  it('also converts the legacy aliases', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.accountsLegacy,
      JSON.stringify([{id: 'a', currentBalance: 12.34}]),
    );
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy,
      JSON.stringify([{id: 's', estimatedAmount: 5.5}]),
    );

    migrateAmountsToCents();

    expect(readJson(LOCAL_STORAGE_KEYS.accountsLegacy)).toEqual([{id: 'a', currentBalance: 1234}]);
    expect(readJson(LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy)).toEqual([
      {id: 's', estimatedAmount: 550},
    ]);
  });

  it('runs only once so already-migrated cents are never converted again', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.accounts,
      JSON.stringify([{id: 'a', currentBalance: 1500.5}]),
    );

    migrateAmountsToCents();
    migrateAmountsToCents();

    expect(readJson(LOCAL_STORAGE_KEYS.accounts)).toEqual([{id: 'a', currentBalance: 150050}]);
  });

  it('ignores missing, malformed, and non-array payloads', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.accounts, 'not-json');
    localStorage.setItem(LOCAL_STORAGE_KEYS.movements, JSON.stringify({amount: 10}));

    expect(() => migrateAmountsToCents()).not.toThrow();
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.accounts)).toBe('not-json');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.movements)).toBe('{"amount":10}');
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.schemaVersion)).toBe(AMOUNT_SCHEMA_VERSION);
  });
});

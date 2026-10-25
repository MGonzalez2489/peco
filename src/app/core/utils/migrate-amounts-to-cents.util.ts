import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {toCents} from './to-cents.util';

type AmountField = 'currentBalance' | 'targetGoal' | 'creditLimit' | 'amount' | 'estimatedAmount';

const ACCOUNT_AMOUNT_FIELDS: readonly AmountField[] = [
  'currentBalance',
  'targetGoal',
  'creditLimit',
];

const LEGACY_ACCOUNT_KEYS: readonly string[] = [
  LOCAL_STORAGE_KEYS.accountsLegacy,
  LOCAL_STORAGE_KEYS.categoriesLegacy,
];

const migrateKey = (key: string, fields: readonly AmountField[]): void => {
  const raw = localStorage.getItem(key);
  if (raw === null) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }

  if (!Array.isArray(parsed)) return;

  const migrated = parsed.map((entry) => {
    if (typeof entry !== 'object' || entry === null) return entry;

    const next = {...(entry as Record<string, unknown>)};
    for (const field of fields) {
      const value = next[field];
      if (typeof value === 'number' && Number.isFinite(value)) {
        next[field] = toCents(value);
      }
    }

    return next;
  });

  localStorage.setItem(key, JSON.stringify(migrated));
};

/**
 * One-time migration of the persisted decimal amounts to integer cents.
 *
 * Payloads written before the cents schema have no version marker, so they are
 * converted once and stamped. The migration is global (all amount-bearing keys)
 * so it can be triggered from any storage service without depending on the
 * construction order of the stores.
 */
export const migrateAmountsToCents = (): void => {
  if (localStorage.getItem(LOCAL_STORAGE_KEYS.schemaVersion) === AMOUNT_SCHEMA_VERSION) return;

  const keys: Array<[string, readonly AmountField[]]> = [
    [LOCAL_STORAGE_KEYS.accounts, ACCOUNT_AMOUNT_FIELDS],
    [LOCAL_STORAGE_KEYS.movements, ['amount']],
    [LOCAL_STORAGE_KEYS.scheduledTransactions, ['estimatedAmount']],
    [LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy, ['estimatedAmount']],
    ...LEGACY_ACCOUNT_KEYS.map(
      (key) => [key, ACCOUNT_AMOUNT_FIELDS] as [string, readonly AmountField[]],
    ),
  ];

  for (const [key, fields] of keys) {
    migrateKey(key, fields);
  }

  localStorage.setItem(LOCAL_STORAGE_KEYS.schemaVersion, AMOUNT_SCHEMA_VERSION);
};

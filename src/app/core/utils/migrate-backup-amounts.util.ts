import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {toCents} from './to-cents.util';

type AmountField = 'currentBalance' | 'targetGoal' | 'creditLimit' | 'amount' | 'estimatedAmount';

const ACCOUNT_AMOUNT_FIELDS: readonly AmountField[] = [
  'currentBalance',
  'targetGoal',
  'creditLimit',
];

const AMOUNT_FIELDS_BY_KEY: ReadonlyArray<readonly [string, readonly AmountField[]]> = [
  [LOCAL_STORAGE_KEYS.accounts, ACCOUNT_AMOUNT_FIELDS],
  [LOCAL_STORAGE_KEYS.accountsLegacy, ACCOUNT_AMOUNT_FIELDS],
  [LOCAL_STORAGE_KEYS.categoriesLegacy, ACCOUNT_AMOUNT_FIELDS],
  [LOCAL_STORAGE_KEYS.movements, ['amount']],
  [LOCAL_STORAGE_KEYS.scheduledTransactions, ['estimatedAmount']],
  [LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy, ['estimatedAmount']],
];

const convertEntries = (value: unknown, fields: readonly AmountField[]): unknown => {
  if (!Array.isArray(value)) return value;

  return value.map((entry) => {
    if (typeof entry !== 'object' || entry === null) return entry;

    const next = {...(entry as Record<string, unknown>)};
    for (const field of fields) {
      const amount = next[field];
      if (typeof amount === 'number' && Number.isFinite(amount)) {
        next[field] = toCents(amount);
      }
    }

    return next;
  });
};

/**
 * Converts the amounts of an imported backup payload to integer cents.
 *
 * Backups exported before the cents schema have no `peco.schema-version` key,
 * so their amounts are still decimal. Backups produced by the current app
 * already declare the schema version and are returned untouched. The returned
 * object always carries the current schema version so the startup migration
 * does not convert the imported cents a second time.
 */
export const migrateBackupAmountsToCents = (
  data: Record<string, unknown>,
): Record<string, unknown> => {
  // The exported value can be either the raw string (`'2'`) or the parsed
  // number (`2`) because the backup service JSON-parses every stored value.
  const schemaVersion = String(data[LOCAL_STORAGE_KEYS.schemaVersion] ?? '');

  if (schemaVersion === AMOUNT_SCHEMA_VERSION) {
    return data;
  }

  const converted: Record<string, unknown> = {...data};
  for (const [key, fields] of AMOUNT_FIELDS_BY_KEY) {
    if (!(key in converted)) continue;
    converted[key] = convertEntries(converted[key], fields);
  }
  converted[LOCAL_STORAGE_KEYS.schemaVersion] = AMOUNT_SCHEMA_VERSION;

  return converted;
};

import {AMOUNT_SCHEMA_VERSION} from '../constants/amount-schema-version.constant';
import {LOCAL_STORAGE_KEYS} from '../constants/local-storage-keys.constant';
import {toCents} from './to-cents.util';

type AmountField =
  | 'currentBalance'
  | 'targetGoal'
  | 'creditLimit'
  | 'amount'
  | 'estimatedAmount'
  | 'initialBalance'
  | 'finalBalance'
  | 'totalInflows'
  | 'totalOutflows'
  | 'totalTransfers'
  | 'globalInitialBalance'
  | 'globalFinalBalance';

interface NestedAmountFields {
  collection: string;
  fields: readonly AmountField[];
}

const ACCOUNT_AMOUNT_FIELDS: readonly AmountField[] = [
  'currentBalance',
  'targetGoal',
  'creditLimit',
];

const PERIOD_SNAPSHOT_AMOUNT_FIELDS: readonly AmountField[] = [
  'globalInitialBalance',
  'globalFinalBalance',
  'totalInflows',
  'totalOutflows',
  'totalTransfers',
];

const ACCOUNT_PERIOD_BALANCE_AMOUNT_FIELDS: readonly AmountField[] = [
  'initialBalance',
  'finalBalance',
  'totalInflows',
  'totalOutflows',
  'totalTransfers',
];

const ACCOUNT_PERIOD_BALANCES: NestedAmountFields = {
  collection: 'accountBalances',
  fields: ACCOUNT_PERIOD_BALANCE_AMOUNT_FIELDS,
};

const AMOUNT_FIELDS_BY_KEY: ReadonlyArray<
  readonly [string, readonly AmountField[], NestedAmountFields?]
> = [
  [LOCAL_STORAGE_KEYS.accounts, ACCOUNT_AMOUNT_FIELDS],
  [LOCAL_STORAGE_KEYS.periodSnapshots, PERIOD_SNAPSHOT_AMOUNT_FIELDS, ACCOUNT_PERIOD_BALANCES],
  [
    LOCAL_STORAGE_KEYS.periodSnapshotsLegacy,
    PERIOD_SNAPSHOT_AMOUNT_FIELDS,
    ACCOUNT_PERIOD_BALANCES,
  ],
  [LOCAL_STORAGE_KEYS.accountsLegacy, ACCOUNT_AMOUNT_FIELDS],
  [LOCAL_STORAGE_KEYS.categoriesLegacy, ACCOUNT_AMOUNT_FIELDS],
  [LOCAL_STORAGE_KEYS.movements, ['amount']],
  [LOCAL_STORAGE_KEYS.scheduledTransactions, ['estimatedAmount']],
  [LOCAL_STORAGE_KEYS.scheduledTransactionsLegacy, ['estimatedAmount']],
];

const convertFields = (target: Record<string, unknown>, fields: readonly AmountField[]): void => {
  for (const field of fields) {
    const amount = target[field];
    if (typeof amount === 'number' && Number.isFinite(amount)) {
      target[field] = toCents(amount);
    }
  }
};

const convertEntries = (
  value: unknown,
  fields: readonly AmountField[],
  nested?: NestedAmountFields,
): unknown => {
  if (!Array.isArray(value)) return value;

  return value.map((entry) => {
    if (typeof entry !== 'object' || entry === null) return entry;

    const next = {...(entry as Record<string, unknown>)};
    convertFields(next, fields);

    if (nested) {
      const collection = next[nested.collection];
      if (Array.isArray(collection)) {
        next[nested.collection] = collection.map((item) => {
          if (typeof item !== 'object' || item === null) return item;

          const nestedEntry = {...(item as Record<string, unknown>)};
          convertFields(nestedEntry, nested.fields);

          return nestedEntry;
        });
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
 * already declare the schema version and are returned untouched. Period
 * snapshots also convert their nested per-account breakdown. The returned
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
  for (const [key, fields, nested] of AMOUNT_FIELDS_BY_KEY) {
    if (!(key in converted)) continue;
    converted[key] = convertEntries(converted[key], fields, nested);
  }
  converted[LOCAL_STORAGE_KEYS.schemaVersion] = AMOUNT_SCHEMA_VERSION;

  return converted;
};

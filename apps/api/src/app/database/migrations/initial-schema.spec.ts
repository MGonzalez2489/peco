import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {createTypeOrmOptions} from '../database.config';
import {InitialSchema1794873600000} from './1794873600000-initial-schema';

jest.setTimeout(180_000);

interface ColumnRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  CHARACTER_MAXIMUM_LENGTH: string | number | null;
  CHARACTER_SET_NAME: string | null;
  COLLATION_NAME: string | null;
  IS_NULLABLE: 'YES' | 'NO';
  COLUMN_DEFAULT: unknown;
  EXTRA: string;
}

interface IndexRow {
  TABLE_NAME: string;
  INDEX_NAME: string;
  NON_UNIQUE: 0 | 1;
  SEQ_IN_INDEX: number;
  COLUMN_NAME: string;
}

interface IndexEntry {
  unique: boolean;
  columns: string[];
}

const TABLES = [
  'accountPeriodBalances',
  'accounts',
  'auditLogs',
  'categories',
  'idempotencyKeys',
  'movements',
  'passwordResetTokens',
  'periodSnapshots',
  'refreshTokens',
  'scheduledExecutions',
  'scheduledTransactions',
  'userPreferences',
  'users',
] as const;

type TableName = (typeof TABLES)[number];

const BASE_COLUMNS = ['id', 'publicId'];
const TIMESTAMP_COLUMNS = ['createdAt', 'updatedAt'];
const SOFT_DELETE_COLUMNS = [...TIMESTAMP_COLUMNS, 'deletedAt'];

const COLUMNS: Record<TableName, string[]> = {
  users: [...BASE_COLUMNS, ...SOFT_DELETE_COLUMNS, 'email', 'passwordHash', 'name', 'lastActiveAt'],
  refreshTokens: [
    ...BASE_COLUMNS,
    ...TIMESTAMP_COLUMNS,
    'userId',
    'tokenHash',
    'expiresAt',
    'revokedAt',
  ],
  passwordResetTokens: [
    ...BASE_COLUMNS,
    ...TIMESTAMP_COLUMNS,
    'userId',
    'tokenHash',
    'expiresAt',
    'usedAt',
  ],
  accounts: [
    ...BASE_COLUMNS,
    ...SOFT_DELETE_COLUMNS,
    'userId',
    'name',
    'type',
    'initialBalance',
    'currentBalance',
    'includeInTotal',
    'targetGoal',
    'creditLimit',
    'color',
    'icon',
    'pinToHome',
    'isRoot',
    'note',
    'version',
    'rootKey',
  ],
  categories: [
    ...BASE_COLUMNS,
    ...SOFT_DELETE_COLUMNS,
    'userId',
    'name',
    'displayName',
    'icon',
    'color',
    'applyType',
    'isRoot',
    'isSystem',
    'activeName',
    'ownerKey',
  ],
  movements: [
    ...BASE_COLUMNS,
    ...SOFT_DELETE_COLUMNS,
    'userId',
    'accountId',
    'targetAccountId',
    'categoryId',
    'type',
    'amount',
    'date',
    'note',
    'reversalId',
    'replacesMovementId',
    'isReversal',
    'isReversed',
    'isCanceled',
    'scheduledTransactionId',
    'version',
  ],
  scheduledTransactions: [
    ...BASE_COLUMNS,
    ...SOFT_DELETE_COLUMNS,
    'userId',
    'name',
    'estimatedAmount',
    'type',
    'categoryId',
    'sourceAccountId',
    'destinationAccountId',
    'frequency',
    'interval',
    'anchorDate',
    'nextContemplatedDate',
    'nextExecutionDate',
    'autoApply',
    'active',
    'totalOccurrences',
    'completedOccurrences',
    'endDate',
    'version',
  ],
  scheduledExecutions: [
    ...BASE_COLUMNS,
    'createdAt',
    'scheduledTransactionId',
    'contemplatedDate',
    'occurrenceDate',
    'movementId',
    'status',
    'reason',
    'attempts',
  ],
  periodSnapshots: [
    ...BASE_COLUMNS,
    'createdAt',
    'userId',
    'period',
    'startDate',
    'endDate',
    'globalInitialBalance',
    'globalFinalBalance',
    'totalInflows',
    'totalOutflows',
    'totalTransfers',
    'totalTransactionsCount',
  ],
  accountPeriodBalances: [
    ...BASE_COLUMNS,
    'snapshotId',
    'accountId',
    'accountName',
    'accountType',
    'color',
    'icon',
    'includeInTotal',
    'initialBalance',
    'finalBalance',
    'totalTransactions',
    'totalInflows',
    'totalOutflows',
    'totalTransfers',
  ],
  userPreferences: [
    ...BASE_COLUMNS,
    ...SOFT_DELETE_COLUMNS,
    'userId',
    'theme',
    'pwaBannerDismissedAt',
    'hideBalance',
    'hideReversal',
  ],
  auditLogs: [
    ...BASE_COLUMNS,
    'createdAt',
    'userId',
    'entity',
    'entityId',
    'action',
    'before',
    'after',
  ],
  idempotencyKeys: [
    ...BASE_COLUMNS,
    ...TIMESTAMP_COLUMNS,
    'userId',
    'key',
    'endpoint',
    'requestHash',
    'responseStatus',
    'responseBody',
    'expiresAt',
  ],
};

const UNIQUE_KEYS: Record<TableName, Record<string, string[]>> = {
  users: {
    UQUsersEmail: ['email'],
    UQUsersPublicId: ['publicId'],
  },
  refreshTokens: {UQRefreshTokensPublicId: ['publicId']},
  passwordResetTokens: {
    UQPasswordResetTokensPublicId: ['publicId'],
    UQPasswordResetTokensTokenHash: ['tokenHash'],
  },
  accounts: {
    UQAccountsPublicId: ['publicId'],
    UQAccountsRootKey: ['rootKey'],
  },
  categories: {
    UQCategoriesOwnerActiveName: ['ownerKey', 'activeName'],
    UQCategoriesPublicId: ['publicId'],
  },
  movements: {UQMovementsPublicId: ['publicId']},
  scheduledTransactions: {UQScheduledTransactionsPublicId: ['publicId']},
  scheduledExecutions: {
    UQScheduledExecutionsPublicId: ['publicId'],
    UQScheduledExecutionsScheduledTransactionIdContemplatedDate: [
      'scheduledTransactionId',
      'contemplatedDate',
    ],
  },
  periodSnapshots: {
    UQPeriodSnapshotsPublicId: ['publicId'],
    UQPeriodSnapshotsUserIdPeriod: ['userId', 'period'],
  },
  accountPeriodBalances: {
    UQAccountPeriodBalancesPublicId: ['publicId'],
    UQAccountPeriodBalancesSnapshotIdAccountId: ['snapshotId', 'accountId'],
  },
  userPreferences: {
    UQUserPreferencesPublicId: ['publicId'],
    UQUserPreferencesUserId: ['userId'],
  },
  auditLogs: {UQAuditLogsPublicId: ['publicId']},
  idempotencyKeys: {
    UQIdempotencyKeysPublicId: ['publicId'],
    UQIdempotencyKeysUserIdKey: ['userId', 'key'],
  },
};

const INDEXES: Record<TableName, Record<string, string[]>> = {
  users: {IDXUsersLastActiveAt: ['lastActiveAt']},
  refreshTokens: {IDXRefreshTokensUserIdExpiresAt: ['userId', 'expiresAt']},
  passwordResetTokens: {
    IDXPasswordResetTokensUserIdExpiresAt: ['userId', 'expiresAt'],
  },
  accounts: {IDXAccountsUserIdDeletedAt: ['userId', 'deletedAt']},
  categories: {},
  movements: {
    IDXMovementsScheduledTransactionId: ['scheduledTransactionId'],
    IDXMovementsUserIdAccountIdDate: ['userId', 'accountId', 'date'],
    IDXMovementsUserIdDate: ['userId', 'date'],
    IDXMovementsUserIdTargetAccountIdDate: ['userId', 'targetAccountId', 'date'],
  },
  scheduledTransactions: {
    IDXScheduledTransactionsUserIdActiveNextExecutionDate: [
      'userId',
      'active',
      'nextExecutionDate',
    ],
  },
  scheduledExecutions: {
    IDXScheduledExecutionsScheduledTransactionIdOccurrenceDate: [
      'scheduledTransactionId',
      'occurrenceDate',
    ],
  },
  periodSnapshots: {},
  accountPeriodBalances: {},
  userPreferences: {},
  auditLogs: {
    IDXAuditLogsUserIdCreatedAt: ['userId', 'createdAt'],
    IDXAuditLogsUserIdEntityEntityId: ['userId', 'entity', 'entityId'],
  },
  idempotencyKeys: {IDXIdempotencyKeysExpiresAt: ['expiresAt']},
};

const ENUM_COLUMNS: Record<TableName, string[]> = {
  users: [],
  refreshTokens: [],
  passwordResetTokens: [],
  accounts: ['type'],
  categories: ['applyType'],
  movements: ['type'],
  scheduledTransactions: ['type', 'frequency'],
  scheduledExecutions: ['status'],
  periodSnapshots: [],
  accountPeriodBalances: ['accountType'],
  userPreferences: ['theme'],
  auditLogs: [],
  idempotencyKeys: [],
};

const MONEY_COLUMNS: Record<TableName, string[]> = {
  users: [],
  refreshTokens: [],
  passwordResetTokens: [],
  accounts: ['initialBalance', 'currentBalance', 'targetGoal', 'creditLimit'],
  categories: [],
  movements: ['amount'],
  scheduledTransactions: ['estimatedAmount'],
  scheduledExecutions: [],
  periodSnapshots: [
    'globalInitialBalance',
    'globalFinalBalance',
    'totalInflows',
    'totalOutflows',
    'totalTransfers',
  ],
  accountPeriodBalances: [
    'initialBalance',
    'finalBalance',
    'totalInflows',
    'totalOutflows',
    'totalTransfers',
  ],
  userPreferences: [],
  auditLogs: [],
  idempotencyKeys: [],
};

const UTC_COLUMNS: Record<TableName, string[]> = {
  users: ['createdAt', 'updatedAt', 'deletedAt', 'lastActiveAt'],
  refreshTokens: ['createdAt', 'updatedAt', 'expiresAt', 'revokedAt'],
  passwordResetTokens: ['createdAt', 'updatedAt', 'expiresAt', 'usedAt'],
  accounts: ['createdAt', 'updatedAt', 'deletedAt'],
  categories: ['createdAt', 'updatedAt', 'deletedAt'],
  movements: ['createdAt', 'updatedAt', 'deletedAt', 'date'],
  scheduledTransactions: ['createdAt', 'updatedAt', 'deletedAt'],
  scheduledExecutions: ['createdAt'],
  periodSnapshots: ['createdAt'],
  accountPeriodBalances: [],
  userPreferences: ['createdAt', 'updatedAt', 'deletedAt', 'pwaBannerDismissedAt'],
  auditLogs: ['createdAt'],
  idempotencyKeys: ['createdAt', 'updatedAt', 'expiresAt'],
};

const GENERATED_COLUMNS: Record<TableName, string[]> = {
  users: [],
  refreshTokens: [],
  passwordResetTokens: [],
  accounts: ['rootKey'],
  categories: ['activeName', 'ownerKey'],
  movements: [],
  scheduledTransactions: [],
  scheduledExecutions: [],
  periodSnapshots: [],
  accountPeriodBalances: [],
  userPreferences: [],
  auditLogs: [],
  idempotencyKeys: [],
};

const sorted = (values: string[]): string[] => [...values].sort();

describe('initial schema migration (MySQL 8)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;

  beforeAll(async () => {
    container = await new MySqlContainer('mysql:8.4')
      .withDatabase('peco')
      .withUsername('peco')
      .withUserPassword('peco')
      .withRootPassword('root')
      .start();

    const options = createTypeOrmOptions({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      name: container.getDatabase(),
      poolSize: 10,
      healthPingTimeoutMs: 1_000,
    });

    dataSource = new DataSource({
      ...(options as DataSourceOptions),
      migrations: [InitialSchema1794873600000],
    });
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  const readColumns = async (): Promise<Map<string, Map<string, ColumnRow>>> => {
    const rows = await dataSource.query<ColumnRow[]>(`
      SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE,
             CHARACTER_MAXIMUM_LENGTH, CHARACTER_SET_NAME, COLLATION_NAME,
             IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION
    `);
    const result = new Map<string, Map<string, ColumnRow>>();
    for (const row of rows) {
      const table = result.get(row.TABLE_NAME) ?? new Map<string, ColumnRow>();
      table.set(row.COLUMN_NAME, row);
      result.set(row.TABLE_NAME, table);
    }
    return result;
  };

  const readIndexes = async (): Promise<Map<string, Map<string, IndexEntry>>> => {
    const rows = await dataSource.query<IndexRow[]>(`
      SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND INDEX_NAME <> 'PRIMARY'
      ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
    `);
    const result = new Map<string, Map<string, IndexEntry>>();
    for (const row of rows) {
      const table = result.get(row.TABLE_NAME) ?? new Map<string, IndexEntry>();
      const entry = table.get(row.INDEX_NAME) ?? {
        unique: row.NON_UNIQUE === 0,
        columns: [],
      };
      entry.columns.push(row.COLUMN_NAME);
      table.set(row.INDEX_NAME, entry);
      result.set(row.TABLE_NAME, table);
    }
    return result;
  };

  it('creates exactly the thirteen camelCase tables of plan 7.3', async () => {
    const rows = await dataSource.query<{TABLE_NAME: string}[]>(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    `);
    const tables = rows
      .map((row) => row.TABLE_NAME)
      .filter((name) => !['migrations', 'typeorm_metadata'].includes(name));

    expect(sorted(tables)).toEqual(sorted([...TABLES]));
    expect(tables.some((name) => name.includes('_'))).toBe(false);
  });

  it('creates the exact columns with the required types and no snake_case', async () => {
    const columnsByTable = await readColumns();

    for (const table of TABLES) {
      const columns = columnsByTable.get(table);
      expect(columns).toBeDefined();
      expect(sorted([...(columns?.keys() ?? [])])).toEqual(sorted(COLUMNS[table]));

      const id = columns?.get('id');
      expect(id?.DATA_TYPE).toBe('bigint');
      expect(id?.COLUMN_TYPE).toContain('unsigned');
      expect(id?.EXTRA).toContain('auto_increment');

      const publicId = columns?.get('publicId');
      expect(publicId?.DATA_TYPE).toBe('char');
      expect(Number(publicId?.CHARACTER_MAXIMUM_LENGTH)).toBe(36);
      expect(publicId?.CHARACTER_SET_NAME).toBe('ascii');
      expect(publicId?.COLLATION_NAME).toBe('ascii_bin');

      for (const name of ENUM_COLUMNS[table]) {
        const column = columns?.get(name);
        expect(column?.DATA_TYPE).toBe('varchar');
        expect(Number(column?.CHARACTER_MAXIMUM_LENGTH)).toBe(20);
      }

      for (const name of MONEY_COLUMNS[table]) {
        const column = columns?.get(name);
        expect(column?.DATA_TYPE).toBe('bigint');
        expect(column?.COLUMN_TYPE).not.toContain('unsigned');
      }

      for (const name of UTC_COLUMNS[table]) {
        const column = columns?.get(name);
        expect(column?.DATA_TYPE).toBe('varchar');
        expect(Number(column?.CHARACTER_MAXIMUM_LENGTH)).toBe(24);
        expect(column?.CHARACTER_SET_NAME).toBe('ascii');
        expect(column?.COLLATION_NAME).toBe('ascii_bin');
        expect(column?.COLUMN_DEFAULT).toBeNull();
        expect(column?.EXTRA).not.toContain('DEFAULT_GENERATED');
        expect(column?.EXTRA).not.toContain('on update');
      }

      for (const name of GENERATED_COLUMNS[table]) {
        expect(columns?.get(name)?.EXTRA).toContain('GENERATED');
      }
    }

    const allColumns = [...columnsByTable.values()].flatMap((columns) => [...columns.keys()]);
    expect(allColumns.some((name) => name.includes('_'))).toBe(false);
    expect(
      [...columnsByTable.values()].some((columns) =>
        [...columns.values()].some((column) => column.DATA_TYPE === 'enum'),
      ),
    ).toBe(false);
  });

  it('creates every unique key and index of plan 7.3', async () => {
    const indexesByTable = await readIndexes();

    for (const table of TABLES) {
      const indexes = indexesByTable.get(table) ?? new Map<string, IndexEntry>();

      for (const [name, keyColumns] of Object.entries(UNIQUE_KEYS[table])) {
        expect(indexes.get(name)).toEqual({
          unique: true,
          columns: keyColumns,
        });
      }
      for (const [name, indexColumns] of Object.entries(INDEXES[table])) {
        expect(indexes.get(name)).toEqual({
          unique: false,
          columns: indexColumns,
        });
      }

      const actualUniqueNames = [...indexes.entries()]
        .filter(([, entry]) => entry.unique)
        .map(([name]) => name);
      const actualIndexNames = [...indexes.keys()].filter(
        (name) => !name.startsWith('FK') && !actualUniqueNames.includes(name),
      );

      expect(sorted(actualUniqueNames)).toEqual(sorted(Object.keys(UNIQUE_KEYS[table])));
      expect(sorted(actualIndexNames)).toEqual(sorted(Object.keys(INDEXES[table])));
    }
  });

  it('drops every table when the migration is reverted', async () => {
    await dataSource.undoLastMigration();

    const rows = await dataSource.query<{TABLE_NAME: string}[]>(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    `);
    const tables = rows.map((row) => row.TABLE_NAME);

    expect(tables.filter((name) => (TABLES as readonly string[]).includes(name))).toEqual([]);
  });
});

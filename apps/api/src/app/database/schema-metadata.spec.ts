import 'reflect-metadata';
import {DataSource, EntityMetadata} from 'typeorm';
import {TYPEORM_ENTITIES, TYPEORM_MIGRATIONS} from './database.config';
import {CamelCaseNamingStrategy} from './naming.strategy';

const EXPECTED_TABLES = [
  'accountPeriodBalances',
  'accounts',
  'auditLogs',
  'categories',
  'idempotencyKeys',
  'jobLocks',
  'movements',
  'passwordResetTokens',
  'periodSnapshots',
  'refreshTokens',
  'scheduledExecutions',
  'scheduledTransactions',
  'userPreferences',
  'users',
] as const;

const SOFT_DELETABLE_TABLES = [
  'accounts',
  'categories',
  'movements',
  'scheduledTransactions',
  'userPreferences',
  'users',
] as const;

const TIMESTAMPED_TABLES = [
  'idempotencyKeys',
  'jobLocks',
  'passwordResetTokens',
  'refreshTokens',
] as const;

const CREATED_ONLY_TABLES = ['auditLogs', 'periodSnapshots', 'scheduledExecutions'] as const;

const BASE_ONLY_TABLES = ['accountPeriodBalances'] as const;

const ENUM_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['accounts', 'type'],
  ['accountPeriodBalances', 'accountType'],
  ['categories', 'applyType'],
  ['movements', 'type'],
  ['scheduledExecutions', 'status'],
  ['scheduledTransactions', 'frequency'],
  ['scheduledTransactions', 'type'],
  ['userPreferences', 'theme'],
];

const UTC_TIMESTAMP_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ['users', 'createdAt'],
  ['users', 'updatedAt'],
  ['users', 'deletedAt'],
  ['users', 'lastActiveAt'],
  ['refreshTokens', 'createdAt'],
  ['refreshTokens', 'updatedAt'],
  ['refreshTokens', 'expiresAt'],
  ['refreshTokens', 'revokedAt'],
  ['passwordResetTokens', 'createdAt'],
  ['passwordResetTokens', 'updatedAt'],
  ['passwordResetTokens', 'expiresAt'],
  ['passwordResetTokens', 'usedAt'],
  ['userPreferences', 'createdAt'],
  ['userPreferences', 'updatedAt'],
  ['userPreferences', 'deletedAt'],
  ['userPreferences', 'pwaBannerDismissedAt'],
  ['idempotencyKeys', 'createdAt'],
  ['idempotencyKeys', 'updatedAt'],
  ['idempotencyKeys', 'expiresAt'],
  ['jobLocks', 'createdAt'],
  ['jobLocks', 'updatedAt'],
  ['jobLocks', 'expiresAt'],
  ['accounts', 'createdAt'],
  ['accounts', 'updatedAt'],
  ['accounts', 'deletedAt'],
  ['categories', 'createdAt'],
  ['categories', 'updatedAt'],
  ['categories', 'deletedAt'],
  ['movements', 'createdAt'],
  ['movements', 'updatedAt'],
  ['movements', 'deletedAt'],
  ['movements', 'date'],
  ['scheduledTransactions', 'createdAt'],
  ['scheduledTransactions', 'updatedAt'],
  ['scheduledTransactions', 'deletedAt'],
  ['periodSnapshots', 'createdAt'],
  ['scheduledExecutions', 'createdAt'],
  ['auditLogs', 'createdAt'],
];

const EXPECTED_INDICES: Readonly<
  Record<string, ReadonlyArray<readonly [string, readonly string[]]>>
> = {
  users: [
    ['UQUsersPublicId', ['publicId']],
    ['UQUsersEmail', ['email']],
    ['IDXUsersLastActiveAt', ['lastActiveAt']],
  ],
  refreshTokens: [
    ['UQRefreshTokensPublicId', ['publicId']],
    ['IDXRefreshTokensUserIdExpiresAt', ['userId', 'expiresAt']],
  ],
  passwordResetTokens: [
    ['UQPasswordResetTokensPublicId', ['publicId']],
    ['UQPasswordResetTokensTokenHash', ['tokenHash']],
    ['IDXPasswordResetTokensUserIdExpiresAt', ['userId', 'expiresAt']],
  ],
  accounts: [
    ['UQAccountsPublicId', ['publicId']],
    ['UQAccountsRootKey', ['rootKey']],
    ['IDXAccountsUserIdDeletedAt', ['userId', 'deletedAt']],
  ],
  categories: [
    ['UQCategoriesPublicId', ['publicId']],
    ['UQCategoriesOwnerActiveName', ['ownerKey', 'activeName']],
  ],
  scheduledTransactions: [
    ['UQScheduledTransactionsPublicId', ['publicId']],
    [
      'IDXScheduledTransactionsUserIdActiveNextExecutionDate',
      ['userId', 'active', 'nextExecutionDate'],
    ],
  ],
  movements: [
    ['UQMovementsPublicId', ['publicId']],
    ['IDXMovementsUserIdDate', ['userId', 'date']],
    ['IDXMovementsUserIdAccountIdDate', ['userId', 'accountId', 'date']],
    ['IDXMovementsUserIdTargetAccountIdDate', ['userId', 'targetAccountId', 'date']],
    ['IDXMovementsScheduledTransactionId', ['scheduledTransactionId']],
  ],
  scheduledExecutions: [
    ['UQScheduledExecutionsPublicId', ['publicId']],
    [
      'UQScheduledExecutionsScheduledTransactionIdContemplatedDate',
      ['scheduledTransactionId', 'contemplatedDate'],
    ],
    [
      'IDXScheduledExecutionsScheduledTransactionIdOccurrenceDate',
      ['scheduledTransactionId', 'occurrenceDate'],
    ],
  ],
  periodSnapshots: [
    ['UQPeriodSnapshotsPublicId', ['publicId']],
    ['UQPeriodSnapshotsUserIdPeriod', ['userId', 'period']],
  ],
  accountPeriodBalances: [
    ['UQAccountPeriodBalancesPublicId', ['publicId']],
    ['UQAccountPeriodBalancesSnapshotIdAccountId', ['snapshotId', 'accountId']],
  ],
  userPreferences: [
    ['UQUserPreferencesPublicId', ['publicId']],
    ['UQUserPreferencesUserId', ['userId']],
  ],
  auditLogs: [
    ['UQAuditLogsPublicId', ['publicId']],
    ['IDXAuditLogsUserIdEntityEntityId', ['userId', 'entity', 'entityId']],
    ['IDXAuditLogsUserIdCreatedAt', ['userId', 'createdAt']],
  ],
  idempotencyKeys: [
    ['UQIdempotencyKeysPublicId', ['publicId']],
    ['UQIdempotencyKeysUserIdKey', ['userId', 'key']],
    ['IDXIdempotencyKeysExpiresAt', ['expiresAt']],
  ],
  jobLocks: [
    ['UQJobLocksPublicId', ['publicId']],
    ['UQJobLocksJobKey', ['jobKey']],
  ],
};

const EXPECTED_FOREIGN_KEYS: Readonly<
  Record<string, ReadonlyArray<readonly [string, string, string, string]>>
> = {
  refreshTokens: [['FKRefreshTokensUserId', 'userId', 'users', 'RESTRICT']],
  passwordResetTokens: [['FKPasswordResetTokensUserId', 'userId', 'users', 'RESTRICT']],
  accounts: [['FKAccountsUserId', 'userId', 'users', 'RESTRICT']],
  categories: [['FKCategoriesUserId', 'userId', 'users', 'RESTRICT']],
  scheduledTransactions: [
    ['FKScheduledTransactionsUserId', 'userId', 'users', 'RESTRICT'],
    ['FKScheduledTransactionsCategoryId', 'categoryId', 'categories', 'RESTRICT'],
    ['FKScheduledTransactionsSourceAccountId', 'sourceAccountId', 'accounts', 'RESTRICT'],
    ['FKScheduledTransactionsDestinationAccountId', 'destinationAccountId', 'accounts', 'RESTRICT'],
  ],
  movements: [
    ['FKMovementsUserId', 'userId', 'users', 'RESTRICT'],
    ['FKMovementsAccountId', 'accountId', 'accounts', 'RESTRICT'],
    ['FKMovementsTargetAccountId', 'targetAccountId', 'accounts', 'RESTRICT'],
    ['FKMovementsCategoryId', 'categoryId', 'categories', 'RESTRICT'],
    ['FKMovementsReversalId', 'reversalId', 'movements', 'SET NULL'],
    ['FKMovementsReplacesMovementId', 'replacesMovementId', 'movements', 'SET NULL'],
    [
      'FKMovementsScheduledTransactionId',
      'scheduledTransactionId',
      'scheduledTransactions',
      'SET NULL',
    ],
  ],
  scheduledExecutions: [
    [
      'FKScheduledExecutionsScheduledTransactionId',
      'scheduledTransactionId',
      'scheduledTransactions',
      'CASCADE',
    ],
    ['FKScheduledExecutionsMovementId', 'movementId', 'movements', 'SET NULL'],
  ],
  periodSnapshots: [['FKPeriodSnapshotsUserId', 'userId', 'users', 'RESTRICT']],
  accountPeriodBalances: [
    ['FKAccountPeriodBalancesSnapshotId', 'snapshotId', 'periodSnapshots', 'CASCADE'],
    ['FKAccountPeriodBalancesAccountId', 'accountId', 'accounts', 'RESTRICT'],
  ],
  userPreferences: [['FKUserPreferencesUserId', 'userId', 'users', 'RESTRICT']],
  auditLogs: [['FKAuditLogsUserId', 'userId', 'users', 'RESTRICT']],
  idempotencyKeys: [['FKIdempotencyKeysUserId', 'userId', 'users', 'RESTRICT']],
};

const buildMetadata = async (): Promise<EntityMetadata[]> => {
  const dataSource = new DataSource({
    type: 'mysql',
    database: 'peco',
    namingStrategy: new CamelCaseNamingStrategy(),
    entities: TYPEORM_ENTITIES,
    migrations: TYPEORM_MIGRATIONS,
  });

  await (dataSource as unknown as {buildMetadatas(): Promise<void>}).buildMetadatas();

  return dataSource.entityMetadatas;
};

describe('database schema metadata (US-103)', () => {
  let metadata: EntityMetadata[];

  beforeAll(async () => {
    metadata = await buildMetadata();
  });

  const byTable = (table: string): EntityMetadata => {
    const found = metadata.find((item) => item.tableName === table);
    if (!found) {
      throw new Error(`Missing table metadata for ${table}`);
    }
    return found;
  };

  const column = (table: string, propertyName: string) => {
    const found = byTable(table).columns.find((item) => item.propertyName === propertyName);
    if (!found) {
      throw new Error(`Missing column ${table}.${propertyName}`);
    }
    return found;
  };

  it('declares exactly the 14 tables of plan 7.3 and US-1001', () => {
    expect(metadata.map((item) => item.tableName).sort()).toEqual([...EXPECTED_TABLES].sort());
  });

  it('uses camelCase table and column names', () => {
    for (const entity of metadata) {
      expect(entity.tableName).toMatch(/^[a-z][A-Za-z0-9]*$/);
      for (const item of entity.columns) {
        expect(item.databaseName).toMatch(/^[a-z][A-Za-z0-9]*$/);
      }
    }
  });

  it('inherits the internal id and the publicId from BaseEntity', () => {
    for (const entity of metadata) {
      const id = column(entity.tableName, 'id');
      expect(id.isPrimary).toBe(true);
      expect(id.isGenerated).toBe(true);
      expect(id.type).toBe('bigint');
      expect(id.unsigned).toBe(true);

      const publicId = column(entity.tableName, 'publicId');
      expect(publicId.type).toBe('char');
      expect(String(publicId.length)).toBe('36');
      expect(publicId.charset).toBe('ascii');
      expect(publicId.collation).toBe('ascii_bin');
    }
  });

  it('applies the timestamp classification of plan 7.2', () => {
    for (const table of SOFT_DELETABLE_TABLES) {
      expect(column(table, 'createdAt')).toBeDefined();
      expect(column(table, 'updatedAt')).toBeDefined();
      expect(column(table, 'deletedAt').isNullable).toBe(true);
    }

    for (const table of TIMESTAMPED_TABLES) {
      expect(column(table, 'createdAt')).toBeDefined();
      expect(column(table, 'updatedAt')).toBeDefined();
      expect(byTable(table).columns.some((item) => item.propertyName === 'deletedAt')).toBe(false);
    }

    for (const table of CREATED_ONLY_TABLES) {
      expect(column(table, 'createdAt')).toBeDefined();
      expect(byTable(table).columns.some((item) => item.propertyName === 'updatedAt')).toBe(false);
    }

    for (const table of BASE_ONLY_TABLES) {
      expect(
        byTable(table).columns.some((item) =>
          ['createdAt', 'updatedAt', 'deletedAt'].includes(item.propertyName),
        ),
      ).toBe(false);
    }
  });

  it('stores every timestamp as a VARCHAR(24) UTC string', () => {
    for (const [table, propertyName] of UTC_TIMESTAMP_COLUMNS) {
      const item = column(table, propertyName);
      expect(item.type).toBe('varchar');
      expect(String(item.length)).toBe('24');
      expect(item.charset).toBe('ascii');
      expect(item.collation).toBe('ascii_bin');
    }

    for (const entity of metadata) {
      for (const item of entity.columns) {
        expect(['datetime', 'timestamp']).not.toContain(item.type);
      }
    }
  });

  it('stores every enum as VARCHAR(20) and never uses MySQL ENUM', () => {
    for (const [table, propertyName] of ENUM_COLUMNS) {
      const item = column(table, propertyName);
      expect(item.type).toBe('varchar');
      expect(String(item.length)).toBe('20');
    }

    for (const entity of metadata) {
      for (const item of entity.columns) {
        expect(item.type).not.toBe('enum');
      }
    }
  });

  it('declares the generated columns of plan 7.4', () => {
    const rootKey = column('accounts', 'rootKey');
    expect(rootKey.generatedType).toBe('VIRTUAL');
    expect(rootKey.asExpression).toContain('isRoot');
    expect(rootKey.asExpression).toContain('deletedAt');

    const activeName = column('categories', 'activeName');
    expect(activeName.generatedType).toBe('VIRTUAL');
    expect(activeName.asExpression).toContain('deletedAt');

    const ownerKey = column('categories', 'ownerKey');
    expect(ownerKey.generatedType).toBe('STORED');
    expect(ownerKey.asExpression).toContain('COALESCE');
  });

  it('declares every unique key and index of plan 7.3', () => {
    for (const [table, expected] of Object.entries(EXPECTED_INDICES)) {
      const actual = byTable(table).indices.map((index) => ({
        name: index.name,
        columns: index.columns.map((item) => item.databaseName),
      }));

      expect(actual).toHaveLength(expected.length);
      for (const [name, columns] of expected) {
        expect(actual).toContainEqual({name, columns});
      }
    }
  });

  it('declares every foreign key with the reviewed delete rule', () => {
    for (const entity of metadata) {
      const expected = EXPECTED_FOREIGN_KEYS[entity.tableName] ?? [];
      const actual = entity.foreignKeys.map((foreignKey) => ({
        name: foreignKey.name,
        column: foreignKey.columns[0].databaseName,
        referencedTable: foreignKey.referencedTablePath,
        onDelete: foreignKey.onDelete,
      }));

      expect(actual).toHaveLength(expected.length);
      for (const [name, column, referencedTable, onDelete] of expected) {
        expect(actual).toContainEqual({name, column, referencedTable, onDelete});
      }
    }
  });

  it('keeps the reviewed optimistic-locking columns', () => {
    for (const table of ['accounts', 'movements', 'scheduledTransactions']) {
      const version = column(table, 'version');
      expect(version.type).toBe('int');
      expect(version.unsigned).toBe(true);
      expect(version.default).toBe(0);
    }
  });
});

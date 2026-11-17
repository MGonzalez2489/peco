import {MigrationInterface, QueryRunner} from 'typeorm';

const TIMESTAMP = 'VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin';
const PUBLIC_ID = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';
const HASH_64 = 'CHAR(64) CHARACTER SET ascii COLLATE ascii_bin';
const COLOR = 'CHAR(7) CHARACTER SET ascii COLLATE ascii_bin';
const PERIOD = 'CHAR(7) CHARACTER SET ascii COLLATE ascii_bin';

/** First reviewed schema: all v1 tables, keys and indexes of plan 7.3. */
export class InitialSchema1794873600000 implements MigrationInterface {
  name = 'InitialSchema1794873600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`email\` VARCHAR(254) NOT NULL,
        \`passwordHash\` VARCHAR(255) NOT NULL,
        \`name\` VARCHAR(80) NOT NULL,
        \`lastActiveAt\` ${TIMESTAMP} NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`deletedAt\` ${TIMESTAMP} NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQUsersPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQUsersEmail\` UNIQUE (\`email\`),
        KEY \`IDXUsersLastActiveAt\` (\`lastActiveAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`refreshTokens\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`tokenHash\` ${HASH_64} NOT NULL,
        \`expiresAt\` ${TIMESTAMP} NOT NULL,
        \`revokedAt\` ${TIMESTAMP} NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQRefreshTokensPublicId\` UNIQUE (\`publicId\`),
        KEY \`IDXRefreshTokensUserIdExpiresAt\` (\`userId\`, \`expiresAt\`),
        CONSTRAINT \`FKRefreshTokensUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`accounts\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`deletedAt\` ${TIMESTAMP} NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`name\` VARCHAR(80) NOT NULL,
        \`type\` VARCHAR(20) NOT NULL,
        \`initialBalance\` BIGINT NOT NULL DEFAULT 0,
        \`currentBalance\` BIGINT NOT NULL DEFAULT 0,
        \`includeInTotal\` TINYINT(1) NOT NULL DEFAULT 1,
        \`targetGoal\` BIGINT NULL,
        \`creditLimit\` BIGINT NULL,
        \`color\` ${COLOR} NULL,
        \`icon\` VARCHAR(40) NULL,
        \`pinToHome\` TINYINT(1) NOT NULL DEFAULT 0,
        \`isRoot\` TINYINT(1) NOT NULL DEFAULT 0,
        \`note\` VARCHAR(500) NULL,
        \`version\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`rootKey\` BIGINT UNSIGNED GENERATED ALWAYS AS (IF((\`isRoot\` = 1) AND (\`deletedAt\` IS NULL), \`userId\`, NULL)) VIRTUAL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQAccountsPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQAccountsRootKey\` UNIQUE (\`rootKey\`),
        KEY \`IDXAccountsUserIdDeletedAt\` (\`userId\`, \`deletedAt\`),
        CONSTRAINT \`FKAccountsUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`categories\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`deletedAt\` ${TIMESTAMP} NULL,
        \`userId\` BIGINT UNSIGNED NULL,
        \`name\` VARCHAR(80) NOT NULL,
        \`displayName\` VARCHAR(80) NOT NULL,
        \`icon\` VARCHAR(40) NULL,
        \`color\` ${COLOR} NULL,
        \`applyType\` VARCHAR(20) NOT NULL,
        \`isRoot\` TINYINT(1) NOT NULL DEFAULT 0,
        \`isSystem\` TINYINT(1) NOT NULL DEFAULT 0,
        \`activeName\` VARCHAR(80) GENERATED ALWAYS AS (IF(\`deletedAt\` IS NULL, \`name\`, NULL)) VIRTUAL,
        \`ownerKey\` BIGINT UNSIGNED GENERATED ALWAYS AS (COALESCE(\`userId\`, 0)) STORED,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQCategoriesPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQCategoriesOwnerActiveName\` UNIQUE (\`ownerKey\`, \`activeName\`),
        CONSTRAINT \`FKCategoriesUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`scheduledTransactions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`deletedAt\` ${TIMESTAMP} NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`name\` VARCHAR(80) NOT NULL,
        \`estimatedAmount\` BIGINT NOT NULL,
        \`type\` VARCHAR(20) NOT NULL,
        \`categoryId\` BIGINT UNSIGNED NOT NULL,
        \`sourceAccountId\` BIGINT UNSIGNED NOT NULL,
        \`destinationAccountId\` BIGINT UNSIGNED NULL,
        \`frequency\` VARCHAR(20) NOT NULL,
        \`interval\` INT UNSIGNED NOT NULL DEFAULT 1,
        \`anchorDate\` DATE NOT NULL,
        \`nextContemplatedDate\` DATE NOT NULL,
        \`nextExecutionDate\` DATE NOT NULL,
        \`autoApply\` TINYINT(1) NOT NULL DEFAULT 0,
        \`active\` TINYINT(1) NOT NULL DEFAULT 1,
        \`totalOccurrences\` INT UNSIGNED NULL,
        \`completedOccurrences\` INT UNSIGNED NOT NULL DEFAULT 0,
        \`endDate\` DATE NULL,
        \`version\` INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQScheduledTransactionsPublicId\` UNIQUE (\`publicId\`),
        KEY \`IDXScheduledTransactionsUserIdActiveNextExecutionDate\` (\`userId\`, \`active\`, \`nextExecutionDate\`),
        CONSTRAINT \`FKScheduledTransactionsUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKScheduledTransactionsCategoryId\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKScheduledTransactionsSourceAccountId\` FOREIGN KEY (\`sourceAccountId\`) REFERENCES \`accounts\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKScheduledTransactionsDestinationAccountId\` FOREIGN KEY (\`destinationAccountId\`) REFERENCES \`accounts\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`movements\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`deletedAt\` ${TIMESTAMP} NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`accountId\` BIGINT UNSIGNED NOT NULL,
        \`targetAccountId\` BIGINT UNSIGNED NULL,
        \`categoryId\` BIGINT UNSIGNED NOT NULL,
        \`type\` VARCHAR(20) NOT NULL,
        \`amount\` BIGINT NOT NULL,
        \`date\` ${TIMESTAMP} NOT NULL,
        \`note\` VARCHAR(500) NULL,
        \`reversalId\` BIGINT UNSIGNED NULL,
        \`replacesMovementId\` BIGINT UNSIGNED NULL,
        \`isReversal\` TINYINT(1) NOT NULL DEFAULT 0,
        \`isReversed\` TINYINT(1) NOT NULL DEFAULT 0,
        \`isCanceled\` TINYINT(1) NOT NULL DEFAULT 0,
        \`scheduledTransactionId\` BIGINT UNSIGNED NULL,
        \`version\` INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQMovementsPublicId\` UNIQUE (\`publicId\`),
        KEY \`IDXMovementsUserIdDate\` (\`userId\`, \`date\`),
        KEY \`IDXMovementsUserIdAccountIdDate\` (\`userId\`, \`accountId\`, \`date\`),
        KEY \`IDXMovementsUserIdTargetAccountIdDate\` (\`userId\`, \`targetAccountId\`, \`date\`),
        KEY \`IDXMovementsScheduledTransactionId\` (\`scheduledTransactionId\`),
        CONSTRAINT \`FKMovementsUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKMovementsAccountId\` FOREIGN KEY (\`accountId\`) REFERENCES \`accounts\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKMovementsTargetAccountId\` FOREIGN KEY (\`targetAccountId\`) REFERENCES \`accounts\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKMovementsCategoryId\` FOREIGN KEY (\`categoryId\`) REFERENCES \`categories\` (\`id\`) ON DELETE RESTRICT,
        CONSTRAINT \`FKMovementsReversalId\` FOREIGN KEY (\`reversalId\`) REFERENCES \`movements\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FKMovementsReplacesMovementId\` FOREIGN KEY (\`replacesMovementId\`) REFERENCES \`movements\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FKMovementsScheduledTransactionId\` FOREIGN KEY (\`scheduledTransactionId\`) REFERENCES \`scheduledTransactions\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`scheduledExecutions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`scheduledTransactionId\` BIGINT UNSIGNED NOT NULL,
        \`contemplatedDate\` DATE NOT NULL,
        \`occurrenceDate\` DATE NULL,
        \`movementId\` BIGINT UNSIGNED NULL,
        \`status\` VARCHAR(20) NOT NULL,
        \`reason\` VARCHAR(40) NULL,
        \`attempts\` INT UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQScheduledExecutionsPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQScheduledExecutionsScheduledTransactionIdContemplatedDate\` UNIQUE (\`scheduledTransactionId\`, \`contemplatedDate\`),
        KEY \`IDXScheduledExecutionsScheduledTransactionIdOccurrenceDate\` (\`scheduledTransactionId\`, \`occurrenceDate\`),
        CONSTRAINT \`FKScheduledExecutionsScheduledTransactionId\` FOREIGN KEY (\`scheduledTransactionId\`) REFERENCES \`scheduledTransactions\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FKScheduledExecutionsMovementId\` FOREIGN KEY (\`movementId\`) REFERENCES \`movements\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`periodSnapshots\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`period\` ${PERIOD} NOT NULL,
        \`startDate\` DATE NOT NULL,
        \`endDate\` DATE NOT NULL,
        \`globalInitialBalance\` BIGINT NOT NULL,
        \`globalFinalBalance\` BIGINT NOT NULL,
        \`totalInflows\` BIGINT NOT NULL,
        \`totalOutflows\` BIGINT NOT NULL,
        \`totalTransfers\` BIGINT NOT NULL,
        \`totalTransactionsCount\` INT UNSIGNED NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQPeriodSnapshotsPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQPeriodSnapshotsUserIdPeriod\` UNIQUE (\`userId\`, \`period\`),
        CONSTRAINT \`FKPeriodSnapshotsUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`accountPeriodBalances\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`snapshotId\` BIGINT UNSIGNED NOT NULL,
        \`accountId\` BIGINT UNSIGNED NOT NULL,
        \`accountName\` VARCHAR(80) NOT NULL,
        \`accountType\` VARCHAR(20) NOT NULL,
        \`color\` ${COLOR} NULL,
        \`icon\` VARCHAR(40) NULL,
        \`includeInTotal\` TINYINT(1) NOT NULL,
        \`initialBalance\` BIGINT NOT NULL,
        \`finalBalance\` BIGINT NOT NULL,
        \`totalTransactions\` INT UNSIGNED NOT NULL,
        \`totalInflows\` BIGINT NOT NULL,
        \`totalOutflows\` BIGINT NOT NULL,
        \`totalTransfers\` BIGINT NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQAccountPeriodBalancesPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQAccountPeriodBalancesSnapshotIdAccountId\` UNIQUE (\`snapshotId\`, \`accountId\`),
        CONSTRAINT \`FKAccountPeriodBalancesSnapshotId\` FOREIGN KEY (\`snapshotId\`) REFERENCES \`periodSnapshots\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FKAccountPeriodBalancesAccountId\` FOREIGN KEY (\`accountId\`) REFERENCES \`accounts\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`userPreferences\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`theme\` VARCHAR(20) NOT NULL,
        \`pwaBannerDismissedAt\` ${TIMESTAMP} NULL,
        \`hideBalance\` TINYINT(1) NOT NULL DEFAULT 0,
        \`hideReversal\` TINYINT(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQUserPreferencesPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQUserPreferencesUserId\` UNIQUE (\`userId\`),
        CONSTRAINT \`FKUserPreferencesUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`auditLogs\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`entity\` VARCHAR(40) NOT NULL,
        \`entityId\` ${PUBLIC_ID} NOT NULL,
        \`action\` VARCHAR(20) NOT NULL,
        \`before\` JSON NULL,
        \`after\` JSON NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQAuditLogsPublicId\` UNIQUE (\`publicId\`),
        KEY \`IDXAuditLogsUserIdEntityEntityId\` (\`userId\`, \`entity\`, \`entityId\`),
        KEY \`IDXAuditLogsUserIdCreatedAt\` (\`userId\`, \`createdAt\`),
        CONSTRAINT \`FKAuditLogsUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await queryRunner.query(`
      CREATE TABLE \`idempotencyKeys\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`userId\` BIGINT UNSIGNED NOT NULL,
        \`key\` VARCHAR(128) NOT NULL,
        \`endpoint\` VARCHAR(200) NOT NULL,
        \`requestHash\` ${HASH_64} NOT NULL,
        \`responseStatus\` SMALLINT UNSIGNED NOT NULL,
        \`responseBody\` JSON NULL,
        \`expiresAt\` ${TIMESTAMP} NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQIdempotencyKeysPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQIdempotencyKeysUserIdKey\` UNIQUE (\`userId\`, \`key\`),
        KEY \`IDXIdempotencyKeysExpiresAt\` (\`expiresAt\`),
        CONSTRAINT \`FKIdempotencyKeysUserId\` FOREIGN KEY (\`userId\`) REFERENCES \`users\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `idempotencyKeys`');
    await queryRunner.query('DROP TABLE `auditLogs`');
    await queryRunner.query('DROP TABLE `userPreferences`');
    await queryRunner.query('DROP TABLE `accountPeriodBalances`');
    await queryRunner.query('DROP TABLE `periodSnapshots`');
    await queryRunner.query('DROP TABLE `scheduledExecutions`');
    await queryRunner.query('DROP TABLE `movements`');
    await queryRunner.query('DROP TABLE `scheduledTransactions`');
    await queryRunner.query('DROP TABLE `categories`');
    await queryRunner.query('DROP TABLE `accounts`');
    await queryRunner.query('DROP TABLE `refreshTokens`');
    await queryRunner.query('DROP TABLE `users`');
  }
}

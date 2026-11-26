import {CategoryRepository} from '../categories/services/category.repository';
import type {AppConfig} from '../config/app-config';
import {createTypeOrmOptions} from '../database/database.config';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, type DataSourceOptions} from 'typeorm';

/** One migrated MySQL 8 database for a Jest suite (14.1/14.2/US-1101). */
export interface TestDatabase {
  readonly container: StartedMySqlContainer;
  readonly dataSource: DataSource;
  readonly database: AppConfig['database'];
}

/** Deletion order respects every foreign key of 7.3. */
const TABLES_IN_DEPENDENCY_ORDER = [
  'auditLogs',
  'scheduledExecutions',
  'idempotencyKeys',
  'movements',
  'scheduledTransactions',
  'accountPeriodBalances',
  'periodSnapshots',
  'refreshTokens',
  'passwordResetTokens',
  'userPreferences',
  'categories',
  'accounts',
  'jobLocks',
  'users',
] as const;

export const startTestDatabase = async (): Promise<TestDatabase> => {
  const container = await new MySqlContainer('mysql:8.4')
    .withDatabase('peco')
    .withUsername('peco')
    .withUserPassword('peco')
    .withRootPassword('root')
    .start();

  const database: AppConfig['database'] = {
    host: container.getHost(),
    port: container.getPort(),
    user: container.getUsername(),
    password: container.getUserPassword(),
    name: container.getDatabase(),
    poolSize: 10,
    healthPingTimeoutMs: 1_000,
  };

  const dataSource = new DataSource(createTypeOrmOptions(database) as DataSourceOptions);
  await dataSource.initialize();
  await dataSource.runMigrations();

  return {container, dataSource, database};
};

/** Every test starts from a clean schema with the global category catalog seeded. */
export const resetTestDatabase = async (dataSource: DataSource): Promise<void> => {
  for (const table of TABLES_IN_DEPENDENCY_ORDER) {
    await dataSource.query(`DELETE FROM \`${table}\``);
  }
  await new CategoryRepository(dataSource).ensureSystemCatalog();
};

export const stopTestDatabase = async (testDatabase?: TestDatabase): Promise<void> => {
  await testDatabase?.dataSource.destroy();
  await testDatabase?.container.stop();
};

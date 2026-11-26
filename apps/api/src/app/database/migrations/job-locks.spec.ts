import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {createTypeOrmOptions} from '../database.config';

jest.setTimeout(180_000);

describe('job locks migration (MySQL 8)', () => {
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

    dataSource = new DataSource(options as DataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('creates the durable jobLocks table with unique publicId and jobKey', async () => {
    const columns = await dataSource.query<{COLUMN_NAME: string}[]>(`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobLocks'
      ORDER BY ORDINAL_POSITION
    `);
    expect(columns.map((row) => row.COLUMN_NAME)).toEqual([
      'id',
      'publicId',
      'createdAt',
      'updatedAt',
      'jobKey',
      'lockToken',
      'expiresAt',
    ]);

    const indexes = await dataSource.query<{INDEX_NAME: string; NON_UNIQUE: 0 | 1}[]>(`
      SELECT INDEX_NAME, NON_UNIQUE
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'jobLocks'
        AND INDEX_NAME <> 'PRIMARY'
      ORDER BY INDEX_NAME
    `);
    expect(indexes).toEqual([
      {INDEX_NAME: 'UQJobLocksJobKey', NON_UNIQUE: 0},
      {INDEX_NAME: 'UQJobLocksPublicId', NON_UNIQUE: 0},
    ]);
  });

  it('drops the jobLocks table when the migration is reverted', async () => {
    await dataSource.undoLastMigration();

    const rows = await dataSource.query<{TABLE_NAME: string}[]>(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'jobLocks'
    `);
    expect(rows).toEqual([]);
  });
});

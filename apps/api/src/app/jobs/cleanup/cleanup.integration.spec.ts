import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {randomUUID} from 'node:crypto';
import {DataSource, DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../../config/app-config';
import {ConfigService} from '../../config/config.service';
import type {UtcClock} from '../../database/clock/utc-clock';
import {createTypeOrmOptions} from '../../database/database.config';
import {CleanupRepository} from './services/cleanup.repository';
import {CleanupService} from './services/cleanup.service';

jest.setTimeout(180_000);

const NOW = '2026-11-25T04:00:00.000Z';
const EXPIRED = '2020-01-01T00:00:00.000Z';
const FUTURE = '2030-01-01T00:00:00.000Z';
const OLD_AUDIT = '2024-11-24T04:00:00.000Z';

type InsertResult = {insertId: number};

describe('retention cleanup (MySQL 8/US-1003)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: CleanupService;
  let userId: number;

  const count = async (
    table: string,
    predicate: string,
    parameters: unknown[] = [],
  ): Promise<number> => {
    const rows = await dataSource.query<{total: number}[]>(
      `SELECT COUNT(*) AS total FROM \`${table}\` WHERE ${predicate}`,
      parameters,
    );
    return Number(rows[0]?.total ?? 0);
  };

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

    const user = (await dataSource.query(
      `INSERT INTO \`users\`
         (\`publicId\`, \`email\`, \`passwordHash\`, \`name\`, \`lastActiveAt\`,
          \`createdAt\`, \`updatedAt\`, \`deletedAt\`)
       VALUES (?, ?, ?, ?, NULL, ?, ?, NULL)`,
      [randomUUID(), 'owner@example.com', 'hash', 'Owner', NOW, NOW],
    )) as InsertResult;
    userId = Number(user.insertId);

    for (const [key, expiresAt] of [
      ['valid', FUTURE],
      ['expired', EXPIRED],
      ['expired-boundary', NOW],
    ] as const) {
      await dataSource.query(
        `INSERT INTO \`idempotencyKeys\`
           (\`publicId\`, \`createdAt\`, \`updatedAt\`, \`userId\`, \`key\`, \`endpoint\`,
            \`requestHash\`, \`responseStatus\`, \`responseBody\`, \`expiresAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          NOW,
          NOW,
          userId,
          key,
          '/api/movements',
          'a'.repeat(64),
          200,
          JSON.stringify({data: null}),
          expiresAt,
        ],
      );
    }

    for (const [hash, expiresAt, revokedAt] of [
      ['1'.repeat(64), FUTURE, null],
      ['2'.repeat(64), EXPIRED, null],
      ['3'.repeat(64), FUTURE, EXPIRED],
    ] as const) {
      await dataSource.query(
        `INSERT INTO \`refreshTokens\`
           (\`publicId\`, \`createdAt\`, \`updatedAt\`, \`userId\`, \`tokenHash\`,
            \`expiresAt\`, \`revokedAt\`)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), NOW, NOW, userId, hash, expiresAt, revokedAt],
      );
    }

    for (const createdAt of [NOW, OLD_AUDIT]) {
      await dataSource.query(
        `INSERT INTO \`auditLogs\`
           (\`publicId\`, \`createdAt\`, \`userId\`, \`entity\`, \`entityId\`, \`action\`,
            \`before\`, \`after\`)
         VALUES (?, ?, ?, ?, ?, ?, NULL, NULL)`,
        [randomUUID(), createdAt, userId, 'accounts', randomUUID(), 'CREATE'],
      );
    }

    const config = new ConfigService({
      operational: {cleanupBatchSize: 2, auditLogRetentionDays: 730},
    } as AppConfig);
    const clock = {now: () => NOW} as UtcClock;
    service = new CleanupService(new CleanupRepository(dataSource), config, clock);
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('purges only expired or revoked rows in bounded batches', async () => {
    const result = await service.run();

    expect(result).toEqual({
      acquired: true,
      idempotencyKeys: 2,
      refreshTokens: 2,
      auditLogs: 1,
    });
    expect(await count('idempotencyKeys', '`expiresAt` > ?', [NOW])).toBe(1);
    expect(await count('refreshTokens', '`revokedAt` IS NULL AND `expiresAt` > ?', [NOW])).toBe(1);
    expect(await count('auditLogs', '`createdAt` >= ?', ['2024-11-25T04:00:00.000Z'])).toBe(1);
  });

  it('is idempotent when run again', async () => {
    expect(await service.run()).toEqual({
      acquired: true,
      idempotencyKeys: 0,
      refreshTokens: 0,
      auditLogs: 0,
    });
  });
});

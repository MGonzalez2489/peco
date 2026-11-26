import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {JobKeyEnum} from '@peco/enums';
import {randomUUID} from 'node:crypto';
import {DataSource, DataSourceOptions} from 'typeorm';
import type {AppConfig} from '../../config/app-config';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import {createTypeOrmOptions} from '../../database/database.config';
import {JobLockService} from './job-lock.service';

jest.setTimeout(180_000);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

type ReleaseAccess = {
  release(jobKey: string, token: string): Promise<void>;
};

describe('job locks (MySQL 8/US-1001)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: JobLockService;
  const jobKey = JobKeyEnum.CLEANUP.toString();

  const countLocks = async (): Promise<number> => {
    const rows = await dataSource.query<{total: number}[]>(
      'SELECT COUNT(*) AS total FROM `jobLocks` WHERE `jobKey` = ?',
      [jobKey],
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

    service = new JobLockService(
      dataSource,
      new UtcClock(),
      new ConfigService({jobs: {jobLockTtlSeconds: 60}} as AppConfig),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  afterEach(async () => {
    await dataSource.query('DELETE FROM `jobLocks`');
  });

  it('lets only one concurrent instance run and releases the lock afterwards', async () => {
    let releaseWork = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      releaseWork = resolve;
    });

    const first = service.withLock(jobKey, async () => {
      await gate;
      return 'first';
    });

    for (let attempt = 0; attempt < 100 && (await countLocks()) === 0; attempt += 1) {
      await delay(10);
    }
    expect(await countLocks()).toBe(1);

    const second = await service.withLock(jobKey, async () => 'second');

    releaseWork();
    expect(await first).toBe('first');
    expect(second).toBeNull();
    expect(await countLocks()).toBe(0);
  });

  it('reclaims an expired row so a crashed run does not need manual cleanup', async () => {
    const clock = new UtcClock();
    await dataSource.query(
      `INSERT INTO \`jobLocks\`
         (\`publicId\`, \`createdAt\`, \`updatedAt\`, \`jobKey\`, \`lockToken\`, \`expiresAt\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), clock.now(), clock.now(), jobKey, randomUUID(), '2020-01-01T00:00:00.000Z'],
    );

    const result = await service.withLock(jobKey, async () => 'reclaimed');

    expect(result).toBe('reclaimed');
    expect(await countLocks()).toBe(0);
  });

  it('only releases a lock with the matching token', async () => {
    const token = randomUUID();
    const clock = new UtcClock();
    await dataSource.query(
      `INSERT INTO \`jobLocks\`
         (\`publicId\`, \`createdAt\`, \`updatedAt\`, \`jobKey\`, \`lockToken\`, \`expiresAt\`)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [randomUUID(), clock.now(), clock.now(), jobKey, token, clock.plusSeconds(60)],
    );

    const release = (service as unknown as ReleaseAccess).release.bind(service);
    await release(jobKey, randomUUID());
    expect(await countLocks()).toBe(1);

    await release(jobKey, token);
    expect(await countLocks()).toBe(0);
  });
});

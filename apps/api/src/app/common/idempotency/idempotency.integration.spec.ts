import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, DataSourceOptions} from 'typeorm';
import {versionConflictException} from '../../accounts/utils/version-conflict.exception';
import {ConfigService} from '../../config/config.service';
import {UtcClock} from '../../database/clock/utc-clock';
import {createTypeOrmOptions} from '../../database/database.config';
import {IdempotencyKeyEntity, UserEntity} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import {IdempotencyKeyRepository} from './services/idempotency-key.repository';
import {IdempotencyService} from './services/idempotency.service';
import {hashIdempotencyRequest} from './utils/hash-idempotency-request.util';

jest.setTimeout(180_000);

const ENDPOINT = 'POST /movements';
const KEY = 'same-idempotency-key';

const fingerprint = (body: unknown, publicId = 'movement-1'): string =>
  hashIdempotencyRequest({
    method: 'POST',
    endpoint: ENDPOINT,
    params: {publicId},
    query: {},
    body,
  });

describe('idempotency keys (MySQL 8, US-509, D108)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: IdempotencyService;

  const seedUser = async (email: string): Promise<UserEntity> =>
    dataSource.getRepository(UserEntity).save(
      dataSource.getRepository(UserEntity).create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: null,
        deletedAt: null,
      }),
    );

  const seedKey = async (
    user: UserEntity,
    overrides: Partial<IdempotencyKeyEntity> = {},
  ): Promise<IdempotencyKeyEntity> =>
    dataSource.getRepository(IdempotencyKeyEntity).save(
      dataSource.getRepository(IdempotencyKeyEntity).create({
        userId: user.id,
        key: KEY,
        endpoint: ENDPOINT,
        requestHash: fingerprint({amount: 1000}),
        responseStatus: 201,
        responseBody: {kind: 'success', data: {movement: 'old'}},
        expiresAt: '2099-01-01T00:00:00.000Z',
        ...overrides,
      }),
    );

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

    const repository = new IdempotencyKeyRepository(dataSource);
    service = new IdempotencyService(
      repository,
      new UserProfileRepository(dataSource),
      {config: {operational: {idempotencyTtlHours: 24}}} as ConfigService,
      new UtcClock(),
    );
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  beforeEach(async () => {
    await dataSource.query('DELETE FROM idempotencyKeys');
    await dataSource.query('DELETE FROM users');
  });

  it('executes once and replays once for concurrent identical requests', async () => {
    const user = await seedUser('concurrent@example.com');
    let executions = 0;
    const run = async (): Promise<{statusCode: number; value: {ok: boolean}}> => {
      executions += 1;
      await new Promise((resolve) => setTimeout(resolve, 25));
      return {statusCode: 201, value: {ok: true}};
    };
    const input = {
      userPublicId: user.publicId,
      key: KEY,
      endpoint: ENDPOINT,
      requestHash: fingerprint({amount: 1000}),
      correlationId: 'request-1',
    };

    const outcomes = await Promise.all([service.execute(input, run), service.execute(input, run)]);

    expect(executions).toBe(1);
    expect(outcomes.filter((outcome) => outcome.kind === 'success')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.kind === 'replay')).toHaveLength(1);
    const stored = await dataSource.getRepository(IdempotencyKeyEntity).find({
      where: {userId: user.id},
    });
    expect(stored).toHaveLength(1);
    expect(stored[0].responseStatus).toBe(201);
  });

  it('rejects a key reused with a different body without executing the handler', async () => {
    const user = await seedUser('reused@example.com');
    const run = jest.fn().mockResolvedValue({statusCode: 201, value: {ok: true}});
    const first = {
      userPublicId: user.publicId,
      key: KEY,
      endpoint: ENDPOINT,
      requestHash: fingerprint({amount: 1000}),
      correlationId: 'request-1',
    };

    await service.execute(first, run);

    await expect(
      service.execute({...first, requestHash: fingerprint({amount: 2000})}, run),
    ).rejects.toMatchObject({code: 'IDEMPOTENCY_KEY_REUSED'});
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('treats an expired row as absent and refreshes it', async () => {
    const user = await seedUser('expired@example.com');
    await seedKey(user, {
      expiresAt: '2020-01-01T00:00:00.000Z',
      requestHash: fingerprint({amount: 999}),
    });
    const run = jest.fn().mockResolvedValue({statusCode: 200, value: {ok: true}});

    const outcome = await service.execute(
      {
        userPublicId: user.publicId,
        key: KEY,
        endpoint: ENDPOINT,
        requestHash: fingerprint({amount: 1000}),
        correlationId: 'request-1',
      },
      run,
    );

    expect(outcome.kind).toBe('success');
    expect(run).toHaveBeenCalledTimes(1);
    const stored = await dataSource.getRepository(IdempotencyKeyEntity).findOneByOrFail({
      userId: user.id,
    });
    expect(stored.requestHash).toBe(fingerprint({amount: 1000}));
    expect(stored.responseStatus).toBe(200);
  });

  it('isolates the same key between users', async () => {
    const firstUser = await seedUser('first@example.com');
    const secondUser = await seedUser('second@example.com');
    const run = jest.fn().mockResolvedValue({statusCode: 201, value: {ok: true}});

    const outcomes = await Promise.all([
      service.execute(
        {
          userPublicId: firstUser.publicId,
          key: KEY,
          endpoint: ENDPOINT,
          requestHash: fingerprint({amount: 1000}),
          correlationId: 'first',
        },
        run,
      ),
      service.execute(
        {
          userPublicId: secondUser.publicId,
          key: KEY,
          endpoint: ENDPOINT,
          requestHash: fingerprint({amount: 1000}),
          correlationId: 'second',
        },
        run,
      ),
    ]);

    expect(outcomes.map((outcome) => outcome.kind)).toEqual(['success', 'success']);
    expect(run).toHaveBeenCalledTimes(2);
    expect(await dataSource.getRepository(IdempotencyKeyEntity).count()).toBe(2);
  });

  it('stores a terminal 4xx and replays it with the new correlation id', async () => {
    const user = await seedUser('failure@example.com');
    const input = {
      userPublicId: user.publicId,
      key: KEY,
      endpoint: ENDPOINT,
      requestHash: fingerprint({amount: 1000}),
      correlationId: 'first-correlation',
    };
    const run = jest.fn().mockRejectedValue(versionConflictException(0, 2));

    const first = await service.execute(input, run);
    expect(first).toMatchObject({kind: 'failure'});
    expect(first).toMatchObject({
      exception: expect.objectContaining({code: 'VERSION_CONFLICT'}),
    });

    const outcome = await service.execute({...input, correlationId: 'second-correlation'}, run);

    expect(outcome).toMatchObject({
      kind: 'replay',
      statusCode: 409,
      body: {data: null, error: {code: 'VERSION_CONFLICT', correlationId: 'second-correlation'}},
    });
    expect(run).toHaveBeenCalledTimes(1);
  });
});

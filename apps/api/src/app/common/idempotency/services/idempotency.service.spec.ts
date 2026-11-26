import {ConfigService} from '../../../config/config.service';
import {UtcClock} from '../../../database/clock/utc-clock';
import {UserProfileRepository} from '../../../users/services/user-profile.repository';
import {versionConflictException} from '../../../accounts/utils/version-conflict.exception';
import {IdempotencyKeyEntity} from '../../../database/entities';
import type {IdempotencyExecutionRequest} from '../types/idempotency-execution-request.type';
import type {StoredIdempotencyBody} from '../types/stored-idempotency-body.type';
import {IdempotencyKeyRepository} from './idempotency-key.repository';
import {IdempotencyService} from './idempotency.service';

const HASH = 'a'.repeat(64);
const ENDPOINT = 'POST /movements';

const request = (
  overrides: Partial<IdempotencyExecutionRequest> = {},
): IdempotencyExecutionRequest => ({
  userPublicId: 'user-public-id',
  key: 'idem-key-12345678',
  endpoint: ENDPOINT,
  requestHash: HASH,
  correlationId: '01JC7Z3Q9K',
  ...overrides,
});

const row = (overrides: Partial<IdempotencyKeyEntity> = {}): IdempotencyKeyEntity =>
  ({
    id: 1,
    userId: 7,
    key: 'idem-key-12345678',
    endpoint: ENDPOINT,
    requestHash: HASH,
    responseStatus: 201,
    responseBody: {kind: 'success', data: {movement: 'stored'}} as StoredIdempotencyBody,
    expiresAt: '2099-01-01T00:00:00.000Z',
    ...overrides,
  }) as IdempotencyKeyEntity;

describe('IdempotencyService (US-509, D108)', () => {
  let service: IdempotencyService;
  let repository: {
    withLock: jest.Mock;
    findForUpdate: jest.Mock;
    savePending: jest.Mock;
    complete: jest.Mock;
  };
  let users: {findActiveByPublicId: jest.Mock};
  let clock: {now: jest.Mock; plusSeconds: jest.Mock};

  beforeEach(() => {
    repository = {
      withLock: jest.fn().mockImplementation(async (_userId, _key, work) => work({})),
      findForUpdate: jest.fn().mockResolvedValue(null),
      savePending: jest.fn().mockImplementation(async (_manager, existing) => existing ?? row()),
      complete: jest.fn().mockResolvedValue(undefined),
    };
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7})};
    clock = {
      now: jest.fn().mockReturnValue('2026-11-22T10:00:00.000Z'),
      plusSeconds: jest.fn().mockReturnValue('2026-11-23T10:00:00.000Z'),
    };

    service = new IdempotencyService(
      repository as unknown as IdempotencyKeyRepository,
      users as unknown as UserProfileRepository,
      {config: {operational: {idempotencyTtlHours: 24}}} as ConfigService,
      clock as unknown as UtcClock,
    );
  });

  it('stores a fresh success with the response status and raw result', async () => {
    const run = jest
      .fn()
      .mockResolvedValue({statusCode: 201, value: {movement: 'fresh', balances: []}});

    const outcome = await service.execute(request(), run);

    expect(outcome).toEqual({kind: 'success', value: {movement: 'fresh', balances: []}});
    expect(clock.plusSeconds).toHaveBeenCalledWith(86400);
    expect(repository.withLock).toHaveBeenCalledWith(7, request().key, expect.any(Function));
    expect(repository.savePending).toHaveBeenCalledWith(
      {},
      null,
      expect.objectContaining({userId: 7, key: request().key, requestHash: HASH}),
    );
    expect(repository.complete).toHaveBeenCalledWith({}, expect.anything(), 201, {
      kind: 'success',
      data: {movement: 'fresh', balances: []},
    });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('unwraps a rendered response envelope before storing the replay payload', async () => {
    const run = jest.fn().mockResolvedValue({
      statusCode: 201,
      value: {data: {movement: 'fresh'}, meta: {total: 1}, error: null},
    });

    await service.execute(request(), run);

    expect(repository.complete).toHaveBeenCalledWith({}, expect.anything(), 201, {
      kind: 'success',
      data: {movement: 'fresh'},
      meta: {total: 1},
    });
  });

  it('replays a stored success with the current correlation id', async () => {
    repository.findForUpdate.mockResolvedValue(row());
    const run = jest.fn();

    const outcome = await service.execute(request({correlationId: 'current-id'}), run);

    expect(outcome).toEqual({
      kind: 'replay',
      statusCode: 201,
      body: {data: {movement: 'stored'}, error: null},
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects a key reused with a different request hash', async () => {
    repository.findForUpdate.mockResolvedValue(row({requestHash: 'b'.repeat(64)}));
    const run = jest.fn();

    await expect(service.execute(request(), run)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
      status: 409,
    });
    expect(run).not.toHaveBeenCalled();
  });

  it('rejects a key reused on a different endpoint', async () => {
    repository.findForUpdate.mockResolvedValue(row({endpoint: 'POST /accounts'}));

    await expect(service.execute(request(), jest.fn())).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
  });

  it('reuses an expired row as a fresh slot', async () => {
    repository.findForUpdate.mockResolvedValue(row({expiresAt: '2020-01-01T00:00:00.000Z'}));
    const run = jest.fn().mockResolvedValue({statusCode: 200, value: {ok: true}});

    await service.execute(request(), run);

    expect(repository.savePending).toHaveBeenCalledWith(
      {},
      expect.objectContaining({id: 1}),
      expect.anything(),
    );
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('stores a terminal 4xx but rethrows it on the first attempt', async () => {
    const exception = versionConflictException(0, 2);
    const run = jest.fn().mockRejectedValue(exception);

    const outcome = await service.execute(request(), run);

    expect(outcome).toEqual({kind: 'failure', exception});
    expect(repository.complete).toHaveBeenCalledWith(
      {},
      expect.anything(),
      409,
      expect.objectContaining({kind: 'error', code: 'VERSION_CONFLICT'}),
    );
  });

  it('replays a stored 4xx with the current correlation id', async () => {
    repository.findForUpdate.mockResolvedValue(
      row({
        responseStatus: 409,
        responseBody: {
          kind: 'error',
          statusCode: 409,
          code: 'VERSION_CONFLICT',
          message: 'El recurso fue modificado por otra operación.',
        } as StoredIdempotencyBody,
      }),
    );

    const outcome = await service.execute(request({correlationId: 'new-id'}), jest.fn());

    expect(outcome).toEqual({
      kind: 'replay',
      statusCode: 409,
      body: {
        data: null,
        error: {
          statusCode: 409,
          code: 'VERSION_CONFLICT',
          message: 'El recurso fue modificado por otra operación.',
          correlationId: 'new-id',
        },
      },
    });
  });

  it('does not store 5xx failures', async () => {
    const exception = new Error('database down');
    const run = jest.fn().mockRejectedValue(exception);

    await expect(service.execute(request(), run)).rejects.toBe(exception);
    expect(repository.complete).not.toHaveBeenCalled();
  });

  it('isolates the same key per user', async () => {
    users.findActiveByPublicId.mockResolvedValueOnce({id: 7}).mockResolvedValueOnce({id: 8});
    const run = jest.fn().mockResolvedValue({statusCode: 201, value: {ok: true}});

    await service.execute(request({userPublicId: 'first'}), run);
    await service.execute(request({userPublicId: 'second'}), run);

    expect(repository.findForUpdate).toHaveBeenNthCalledWith(1, {}, 7, request().key);
    expect(repository.findForUpdate).toHaveBeenNthCalledWith(2, {}, 8, request().key);
  });
});

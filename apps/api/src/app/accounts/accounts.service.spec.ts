import {HttpStatus} from '@nestjs/common';
import {AccountTypeEnum, ApiErrorCodeEnum} from '@peco/enums';
import type {AccountEntity, UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {AccountsService} from './accounts.service';
import {AccountDeletionRepository} from './services/account-deletion.repository';
import {AccountRepository} from './services/account.repository';

const account = (overrides: Partial<AccountEntity> = {}): AccountEntity =>
  ({
    id: 1,
    publicId: 'account-public-id',
    userId: 42,
    name: 'Efectivo',
    type: AccountTypeEnum.CASH.toString(),
    initialBalance: 100000,
    currentBalance: 150000,
    includeInTotal: true,
    targetGoal: null,
    creditLimit: null,
    color: '#10B981',
    icon: 'banknote',
    pinToHome: true,
    isRoot: true,
    note: null,
    version: 0,
    rootKey: 42,
    createdAt: '2026-11-20T10:00:00.000Z',
    updatedAt: '2026-11-20T10:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }) as AccountEntity;

const CREATE_REQUEST = {
  name: 'Ahorros',
  type: AccountTypeEnum.SAVINGS.toString(),
  initialBalance: 500000,
  includeInTotal: true,
  targetGoal: 1000000,
  creditLimit: null,
  color: '#F59E0B',
  icon: 'piggy-bank',
  pinToHome: false,
  note: null,
};

const UPDATE_REQUEST = {
  name: 'Ahorros actualizados',
  type: AccountTypeEnum.CREDIT.toString(),
  creditLimit: 600000,
  pinToHome: true,
  version: 0,
};

describe('AccountsService (US-301/US-302/US-303/US-304/US-305)', () => {
  let profile: {findActiveByPublicId: jest.Mock};
  let repository: {
    findActiveByUser: jest.Mock;
    findActiveByPublicId: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let deletions: {deleteWithTransfer: jest.Mock};
  let service: AccountsService;

  beforeEach(() => {
    profile = {findActiveByPublicId: jest.fn()};
    repository = {
      findActiveByUser: jest.fn(),
      findActiveByPublicId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    deletions = {deleteWithTransfer: jest.fn()};
    service = new AccountsService(
      profile as unknown as UserProfileRepository,
      repository as unknown as AccountRepository,
      deletions as unknown as AccountDeletionRepository,
    );
  });

  it('scopes the query to the active user and maps only public account fields', async () => {
    profile.findActiveByPublicId.mockResolvedValue({
      id: 42,
      publicId: 'user-public-id',
    } as UserEntity);
    repository.findActiveByUser.mockResolvedValue([account()]);

    const result = await service.list('user-public-id');

    expect(profile.findActiveByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(repository.findActiveByUser).toHaveBeenCalledWith(42);
    expect(result.items).toHaveLength(1);
    expect(Object.keys(result.items[0])).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
    expect(result.items[0]).toMatchObject({
      publicId: 'account-public-id',
      name: 'Efectivo',
      currentBalance: 150000,
      version: 0,
    });
  });

  it('computes every summary figure from the same visible rows', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByUser.mockResolvedValue([
      account({publicId: 'cash', currentBalance: 150000}),
      account({publicId: 'debit', type: AccountTypeEnum.DEBIT.toString(), currentBalance: 250000}),
      account({
        publicId: 'credit',
        type: AccountTypeEnum.CREDIT.toString(),
        currentBalance: -120000,
      }),
      account({
        publicId: 'savings',
        type: AccountTypeEnum.SAVINGS.toString(),
        currentBalance: 500000,
        includeInTotal: false,
      }),
      account({publicId: 'cash-2', currentBalance: 30000}),
    ]);

    const {summary} = await service.list('user-public-id');

    expect(summary).toMatchObject({
      totalBalance: 810000,
      availableBalance: 430000,
      liabilitiesBalance: 120000,
    });
    expect(summary.typeSummaries).toEqual([
      {type: AccountTypeEnum.CASH.toString(), count: 2, total: 180000},
      {type: AccountTypeEnum.DEBIT.toString(), count: 1, total: 250000},
      {type: AccountTypeEnum.CREDIT.toString(), count: 1, total: -120000},
      {type: AccountTypeEnum.SAVINGS.toString(), count: 1, total: 500000},
    ]);
    expect(summary.totalBalance).toBe(
      summary.typeSummaries.reduce((total, item) => total + item.total, 0),
    );
  });

  it('rejects a principal that no longer resolves to an active user', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.list('missing-user')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(repository.findActiveByUser).not.toHaveBeenCalled();
  });

  it('creates an owner-scoped non-root account and exposes only public fields', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.create.mockResolvedValue(
      account({
        publicId: 'created-account',
        name: CREATE_REQUEST.name,
        type: CREATE_REQUEST.type,
        initialBalance: 500000,
        currentBalance: 500000,
        isRoot: false,
        rootKey: null,
      }),
    );

    const result = await service.create('user-public-id', CREATE_REQUEST);

    expect(profile.findActiveByPublicId).toHaveBeenCalledWith('user-public-id');
    expect(repository.create).toHaveBeenCalledWith(42, CREATE_REQUEST);
    expect(result).toMatchObject({
      publicId: 'created-account',
      name: 'Ahorros',
      currentBalance: 500000,
      isRoot: false,
      version: 0,
    });
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
  });

  it('rejects a negative initial balance for non-credit accounts before writing', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);

    await expect(
      service.create('user-public-id', {
        ...CREATE_REQUEST,
        type: AccountTypeEnum.CASH.toString(),
        initialBalance: -1,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      code: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('allows a negative initial balance for credit accounts', async () => {
    const request = {
      ...CREATE_REQUEST,
      type: AccountTypeEnum.CREDIT.toString(),
      initialBalance: -120000,
      creditLimit: 500000,
    };
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.create.mockResolvedValue(
      account({type: request.type, initialBalance: -120000, currentBalance: -120000}),
    );

    const result = await service.create('user-public-id', request);

    expect(repository.create).toHaveBeenCalledWith(42, request);
    expect(result.currentBalance).toBe(-120000);
  });

  it('rejects creation for a principal that no longer resolves to an active user', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.create('missing-user', CREATE_REQUEST)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('returns an owner-scoped account detail with only public fields', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account());

    const result = await service.findOne('user-public-id', 'account-public-id');

    expect(repository.findActiveByPublicId).toHaveBeenCalledWith(42, 'account-public-id');
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
    expect(result).toMatchObject({publicId: 'account-public-id', version: 0});
  });

  it('returns 404 for a foreign or soft-deleted account detail', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.findOne('user-public-id', 'foreign-id')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
  });

  it('returns 404 for an account detail when the principal is inactive', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.findOne('missing-user', 'account-public-id')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(repository.findActiveByPublicId).not.toHaveBeenCalled();
  });

  it('applies metadata updates with the expected version and returns the incremented row', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(
      account({
        type: AccountTypeEnum.CREDIT.toString(),
        currentBalance: -120000,
        creditLimit: 500000,
      }),
    );
    repository.update.mockResolvedValue({
      status: 'updated',
      account: account({
        name: UPDATE_REQUEST.name,
        type: AccountTypeEnum.CREDIT.toString(),
        currentBalance: -120000,
        creditLimit: 600000,
        pinToHome: true,
        version: 1,
      }),
    });

    const result = await service.update('user-public-id', 'account-public-id', UPDATE_REQUEST);

    expect(repository.findActiveByPublicId).toHaveBeenCalledWith(42, 'account-public-id');
    expect(repository.update).toHaveBeenCalledWith(42, 'account-public-id', UPDATE_REQUEST);
    expect(result).toMatchObject({
      name: 'Ahorros actualizados',
      currentBalance: -120000,
      version: 1,
    });
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
  });

  it('rejects a stale client version before writing', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account({version: 2}));

    await expect(
      service.update('user-public-id', 'account-public-id', {...UPDATE_REQUEST, version: 1}),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
      details: {expectedVersion: 1, currentVersion: 2},
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('maps a compare-and-set conflict to 409 with the current version', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(
      account({type: AccountTypeEnum.CREDIT.toString(), creditLimit: 500000}),
    );
    repository.update.mockResolvedValue({status: 'conflict', currentVersion: 3});

    await expect(
      service.update('user-public-id', 'account-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
      details: {expectedVersion: 0, currentVersion: 3},
    });
  });

  it('maps a concurrent account deletion to 404', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(
      account({type: AccountTypeEnum.CREDIT.toString(), creditLimit: 500000}),
    );
    repository.update.mockResolvedValue({status: 'not-found'});

    await expect(
      service.update('user-public-id', 'account-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
  });

  it('rejects a type change to non-credit while the balance is negative', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(
      account({type: AccountTypeEnum.CREDIT.toString(), currentBalance: -120000}),
    );

    await expect(
      service.update('user-public-id', 'account-public-id', {
        name: 'Efectivo',
        type: AccountTypeEnum.CASH.toString(),
        version: 0,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a non-null credit limit when the effective type is non-credit', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account());

    await expect(
      service.update('user-public-id', 'account-public-id', {
        creditLimit: 100000,
        version: 0,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      code: ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
      details: {fields: {creditLimit: expect.any(String)}},
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a type change away from credit while an existing limit remains', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(
      account({type: AccountTypeEnum.CREDIT.toString(), creditLimit: 500000}),
    );

    await expect(
      service.update('user-public-id', 'account-public-id', {
        type: AccountTypeEnum.CASH.toString(),
        version: 0,
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      code: ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
      details: {fields: {creditLimit: expect.any(String)}},
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('sets pinToHome explicitly through the optimistic update and exposes only public fields', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account({pinToHome: true, version: 2}));
    repository.update.mockResolvedValue({
      status: 'updated',
      account: account({pinToHome: false, version: 3}),
    });

    const result = await service.setPin('user-public-id', 'account-public-id', {
      pinToHome: false,
      version: 2,
    });

    expect(repository.findActiveByPublicId).toHaveBeenCalledWith(42, 'account-public-id');
    expect(repository.update).toHaveBeenCalledWith(42, 'account-public-id', {
      pinToHome: false,
      version: 2,
    });
    expect(result).toMatchObject({pinToHome: false, version: 3});
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'initialBalance', 'deletedAt', 'rootKey']),
    );
  });

  it('pins without a version as last-write-wins', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account({pinToHome: false}));
    repository.update.mockResolvedValue({
      status: 'updated',
      account: account({pinToHome: true, version: 1}),
    });

    const result = await service.setPin('user-public-id', 'account-public-id', {pinToHome: true});

    expect(repository.update).toHaveBeenCalledWith(42, 'account-public-id', {
      pinToHome: true,
      version: undefined,
    });
    expect(result.pinToHome).toBe(true);
  });

  it('rejects a stale version before pinning', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account({version: 2}));

    await expect(
      service.setPin('user-public-id', 'account-public-id', {pinToHome: true, version: 1}),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
      details: {expectedVersion: 1, currentVersion: 2},
    });
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('maps a pinning compare-and-set conflict and a concurrent deletion', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    repository.findActiveByPublicId.mockResolvedValue(account());
    repository.update
      .mockResolvedValueOnce({status: 'conflict', currentVersion: 4})
      .mockResolvedValueOnce({status: 'not-found'});

    await expect(
      service.setPin('user-public-id', 'account-public-id', {pinToHome: true, version: 0}),
    ).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      code: ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
      details: {expectedVersion: 0, currentVersion: 4},
    });
    await expect(
      service.setPin('user-public-id', 'account-public-id', {pinToHome: false}),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
  });

  it('returns 404 when pinning a foreign account or with an inactive principal', async () => {
    profile.findActiveByPublicId
      .mockResolvedValueOnce({id: 42} as UserEntity)
      .mockResolvedValueOnce(null);
    repository.findActiveByPublicId.mockResolvedValue(null);

    await expect(
      service.setPin('user-public-id', 'foreign-id', {pinToHome: true}),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    await expect(
      service.setPin('missing-user', 'account-public-id', {pinToHome: true}),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(repository.findActiveByPublicId).toHaveBeenCalledTimes(1);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects an account update for a principal that no longer resolves', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(
      service.update('missing-user', 'account-public-id', UPDATE_REQUEST),
    ).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(repository.findActiveByPublicId).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  const sourceAccount = () =>
    account({publicId: 'source-id', currentBalance: 0, isRoot: false, version: 1});
  const destinationAccount = () =>
    account({id: 2, publicId: 'destination-id', currentBalance: 200000, isRoot: false});
  const transferMovement = () =>
    ({
      publicId: 'movement-id',
      type: 'TRANSFER',
      amount: 50000,
      date: '2026-11-21T10:00:00.000Z',
      note: null,
      isReversal: false,
      isReversed: false,
      isCanceled: false,
      version: 0,
      createdAt: '2026-11-21T10:00:00.000Z',
      updatedAt: '2026-11-21T10:00:00.000Z',
    }) as unknown as import('../database/entities').MovementEntity;
  const transferCategory = () =>
    ({
      publicId: 'category-id',
      name: 'transfer',
      displayName: 'Transferencia',
      color: '#6366F1',
      icon: 'arrow-left-right',
      applyType: 'TRANSFER',
    }) as unknown as import('../database/entities').CategoryEntity;

  it('deletes a zero-balance account without a destination or transfer movement', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    deletions.deleteWithTransfer.mockResolvedValue({
      status: 'deleted',
      source: sourceAccount(),
      destination: null,
      movement: null,
      movementAccount: null,
      targetAccount: null,
      category: null,
    });

    const result = await service.remove('user-public-id', 'source-id');

    expect(deletions.deleteWithTransfer).toHaveBeenCalledWith(42, 'source-id', undefined);
    expect(result).toMatchObject({
      deletedAccountPublicId: 'source-id',
      transferMovement: null,
      balances: [{accountPublicId: 'source-id', currentBalance: 0, version: 1}],
    });
  });

  it('returns the transfer movement and both refreshed balances', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    deletions.deleteWithTransfer.mockResolvedValue({
      status: 'deleted',
      source: sourceAccount(),
      destination: destinationAccount(),
      movement: transferMovement(),
      movementAccount: sourceAccount(),
      targetAccount: destinationAccount(),
      category: transferCategory(),
    });

    const result = await service.remove('user-public-id', 'source-id', 'destination-id');

    expect(deletions.deleteWithTransfer).toHaveBeenCalledWith(
      42,
      'source-id',
      'destination-id',
    );
    expect(result.transferMovement).toMatchObject({
      publicId: 'movement-id',
      type: 'TRANSFER',
      amount: 50000,
      account: {publicId: 'source-id'},
      targetAccount: {publicId: 'destination-id'},
      category: {publicId: 'category-id'},
    });
    expect(result.balances).toEqual([
      {accountPublicId: 'source-id', currentBalance: 0, version: 1},
      {accountPublicId: 'destination-id', currentBalance: 200000, version: 0},
    ]);
  });

  it.each([
    ['not-found', HttpStatus.NOT_FOUND, ApiErrorCodeEnum.NOT_FOUND.toString()],
    ['root-protected', HttpStatus.CONFLICT, ApiErrorCodeEnum.ROOT_ACCOUNT_PROTECTED.toString()],
    ['self-transfer', HttpStatus.UNPROCESSABLE_ENTITY, ApiErrorCodeEnum.UNPROCESSABLE_ENTITY.toString()],
    ['transfer-required', HttpStatus.CONFLICT, ApiErrorCodeEnum.TRANSFER_REQUIRED.toString()],
    [
      'negative-balance',
      HttpStatus.CONFLICT,
      ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED.toString(),
    ],
    ['period-closed', HttpStatus.CONFLICT, ApiErrorCodeEnum.PERIOD_CLOSED.toString()],
  ] as const)('maps %s to the stable %s error', async (status, httpStatus, code) => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42} as UserEntity);
    deletions.deleteWithTransfer.mockResolvedValue({status});

    await expect(service.remove('user-public-id', 'source-id')).rejects.toMatchObject({
      status: httpStatus,
      code,
    });
  });

  it('rejects deletion for an inactive principal before touching the repository', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.remove('missing-user', 'source-id')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(deletions.deleteWithTransfer).not.toHaveBeenCalled();
  });
});

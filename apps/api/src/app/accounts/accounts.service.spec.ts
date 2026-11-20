import {HttpStatus} from '@nestjs/common';
import {AccountTypeEnum, ApiErrorCodeEnum} from '@peco/enums';
import type {AccountEntity, UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {AccountsService} from './accounts.service';
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

describe('AccountsService.list (US-301)', () => {
  let profile: {findActiveByPublicId: jest.Mock};
  let repository: {findActiveByUser: jest.Mock};
  let service: AccountsService;

  beforeEach(() => {
    profile = {findActiveByPublicId: jest.fn()};
    repository = {findActiveByUser: jest.fn()};
    service = new AccountsService(
      profile as unknown as UserProfileRepository,
      repository as unknown as AccountRepository,
    );
  });

  it('scopes the query to the active user and maps only public account fields', async () => {
    profile.findActiveByPublicId.mockResolvedValue({id: 42, publicId: 'user-public-id'} as UserEntity);
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
});

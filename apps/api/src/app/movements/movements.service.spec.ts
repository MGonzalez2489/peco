import {HttpStatus} from '@nestjs/common';
import {
  AccountTypeEnum,
  ApiErrorCodeEnum,
  MovementTypeEnum,
  MovementWriteStatusEnum,
} from '@peco/enums';
import type {AccountEntity, CategoryEntity, MovementEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {UtcClock} from '../database/clock/utc-clock';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';

const CREATED_AT = '2026-11-21T10:00:00.000Z';

const account = (overrides: Partial<AccountEntity> = {}): AccountEntity =>
  ({
    id: 1,
    publicId: 'source-account',
    userId: 42,
    name: 'Efectivo',
    type: AccountTypeEnum.CASH.toString(),
    currentBalance: 100000,
    version: 0,
    ...overrides,
  }) as AccountEntity;

const category = (): CategoryEntity =>
  ({
    id: 7,
    publicId: 'root-category',
    name: 'unknown',
    displayName: 'Otros',
    color: null,
    icon: 'folder-open',
    applyType: 'BOTH',
  }) as CategoryEntity;

const movement = (): MovementEntity =>
  ({
    id: 9,
    publicId: 'movement-public-id',
    type: MovementTypeEnum.INCOME.toString(),
    amount: 3000,
    date: CREATED_AT,
    note: null,
    isReversal: false,
    isReversed: false,
    isCanceled: false,
    version: 0,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  }) as MovementEntity;

const createdResult = () => ({
  status: MovementWriteStatusEnum.CREATED.toString(),
  movement: movement(),
  account: account(),
  targetAccount: null,
  category: category(),
  balances: [{accountPublicId: 'source-account', currentBalance: 103000, version: 1}],
});

const REQUEST = {
  type: MovementTypeEnum.INCOME.toString(),
  amount: 3000,
  accountPublicId: 'source-account',
} as const;

describe('MovementsService (US-501)', () => {
  let profile: {findActiveByPublicId: jest.Mock};
  let creations: {create: jest.Mock};
  let clock: {now: jest.Mock};
  let service: MovementsService;

  beforeEach(() => {
    profile = {findActiveByPublicId: jest.fn()};
    creations = {create: jest.fn()};
    clock = {now: jest.fn().mockReturnValue(CREATED_AT)};
    service = new MovementsService(
      profile as unknown as UserProfileRepository,
      creations as unknown as MovementCreationRepository,
      clock as unknown as UtcClock,
    );
    profile.findActiveByPublicId.mockResolvedValue({id: 42, publicId: 'user-public-id'});
  });

  it('normalizes the supplied UTC date before the serialized write', async () => {
    creations.create.mockResolvedValue(createdResult());

    await service.create('user-public-id', {
      ...REQUEST,
      date: '2026-11-15T10:00:00Z',
    });

    expect(creations.create).toHaveBeenCalledWith(42, {
      ...REQUEST,
      date: '2026-11-15T10:00:00.000Z',
    });
  });

  it('defaults the date to the UTC clock', async () => {
    creations.create.mockResolvedValue(createdResult());

    await service.create('user-public-id', REQUEST);

    expect(creations.create).toHaveBeenCalledWith(42, {...REQUEST, date: CREATED_AT});
  });

  it('returns only public movement and balance fields', async () => {
    creations.create.mockResolvedValue(createdResult());

    const result = await service.create('user-public-id', REQUEST);

    expect(result.movement.publicId).toBe('movement-public-id');
    expect(result.balances).toEqual([
      {accountPublicId: 'source-account', currentBalance: 103000, version: 1},
    ]);
    expect(Object.keys(result.movement)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'accountId', 'categoryId']),
    );
  });

  it('maps every repository conflict to its stable API error', async () => {
    const cases = [
      [MovementWriteStatusEnum.NOT_FOUND, HttpStatus.NOT_FOUND, ApiErrorCodeEnum.NOT_FOUND],
      [
        MovementWriteStatusEnum.SELF_TRANSFER,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ApiErrorCodeEnum.UNPROCESSABLE_ENTITY,
      ],
      [
        MovementWriteStatusEnum.TRANSFER_REQUIRED,
        HttpStatus.CONFLICT,
        ApiErrorCodeEnum.TRANSFER_REQUIRED,
      ],
      [
        MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE,
        HttpStatus.UNPROCESSABLE_ENTITY,
        ApiErrorCodeEnum.CATEGORY_NOT_COMPATIBLE,
      ],
      [
        MovementWriteStatusEnum.NEGATIVE_BALANCE,
        HttpStatus.CONFLICT,
        ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED,
      ],
      [
        MovementWriteStatusEnum.PERIOD_CLOSED,
        HttpStatus.CONFLICT,
        ApiErrorCodeEnum.PERIOD_CLOSED,
      ],
    ] as const;

    for (const [status, httpStatus, code] of cases) {
      creations.create.mockResolvedValue({status: status.toString()});
      await expect(service.create('user-public-id', REQUEST)).rejects.toMatchObject({
        status: httpStatus,
        code: code.toString(),
      });
    }
  });

  it('rejects an inactive user before writing', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.create('user-public-id', REQUEST)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(creations.create).not.toHaveBeenCalled();
  });
});

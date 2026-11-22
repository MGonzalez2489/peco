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
import type {ListMovementsQueryDto} from './dto/list-movements-query.dto';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementDeleteRepository} from './services/movement-delete.repository';
import {MovementQueryRepository} from './services/movement-query.repository';
import {MovementReplaceRepository} from './services/movement-replace.repository';
import {MovementUpdateRepository} from './services/movement-update.repository';

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

describe('MovementsService (US-501–506)', () => {
  let profile: {findActiveByPublicId: jest.Mock};
  let creations: {create: jest.Mock};
  let queries: {list: jest.Mock; findOwnerDetail: jest.Mock};
  let updates: {update: jest.Mock};
  let replacements: {replace: jest.Mock};
  let deletions: {delete: jest.Mock};
  let clock: {now: jest.Mock};
  let service: MovementsService;

  beforeEach(() => {
    profile = {findActiveByPublicId: jest.fn()};
    creations = {create: jest.fn()};
    queries = {list: jest.fn(), findOwnerDetail: jest.fn()};
    updates = {update: jest.fn()};
    replacements = {replace: jest.fn()};
    deletions = {delete: jest.fn()};
    clock = {now: jest.fn().mockReturnValue(CREATED_AT)};
    service = new MovementsService(
      profile as unknown as UserProfileRepository,
      creations as unknown as MovementCreationRepository,
      queries as unknown as MovementQueryRepository,
      updates as unknown as MovementUpdateRepository,
      replacements as unknown as MovementReplaceRepository,
      deletions as unknown as MovementDeleteRepository,
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

  const pageResult = () => ({
    items: [
      {
        ...movement(),
        account: account(),
        targetAccount: null,
        category: category(),
      },
    ],
    nextCursor: 'cursor-2',
    totals: {totalIncome: 3000, totalExpenses: 0, netBalance: 3000, count: 1},
  });

  it('defaults an unfiltered list to the current UTC month of the injected clock', async () => {
    queries.list.mockResolvedValue(pageResult());

    const result = await service.list('user-public-id', {limit: 20} as ListMovementsQueryDto);

    expect(queries.list).toHaveBeenCalledWith(
      {
        userId: 42,
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-30T23:59:59.999Z',
        type: null,
        accountPublicId: null,
        categoryPublicId: null,
        accountType: null,
        note: null,
        excludeReversals: false,
        includeCanceled: true,
      },
      undefined,
      20,
    );
    expect(result.nextCursor).toBe('cursor-2');
    expect(result.totals).toEqual(pageResult().totals);
    expect(result.items[0]?.publicId).toBe('movement-public-id');
    expect(Object.keys(result.items[0] ?? {})).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'accountId', 'categoryId']),
    );
  });

  it('resolves an explicit period, normalizes the note and applies boolean defaults', async () => {
    queries.list.mockResolvedValue(pageResult());

    await service.list('user-public-id', {
      limit: 5,
      period: '2026-01',
      note: '  SUPER  ',
      cursor: 'opaque',
      excludeReversals: true,
      includeCanceled: false,
    } as ListMovementsQueryDto);

    expect(queries.list).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-01-31T23:59:59.999Z',
        note: 'super',
        excludeReversals: true,
        includeCanceled: false,
      }),
      'opaque',
      5,
    );
  });

  it('uses inclusive day bounds when an explicit range replaces the period', async () => {
    queries.list.mockResolvedValue(pageResult());

    await service.list('user-public-id', {
      limit: 20,
      from: '2026-01-01',
      to: '2026-02-28',
    } as ListMovementsQueryDto);

    expect(queries.list).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-28T23:59:59.999Z',
      }),
      undefined,
      20,
    );
  });

  const detailEntity = (): MovementEntity =>
    ({
      ...movement(),
      account: account(),
      targetAccount: null,
      category: category(),
      reversalOf: {publicId: 'original-public-id'},
      replacesMovement: {publicId: 'replaced-public-id'},
      scheduledTransaction: {publicId: 'schedule-public-id'},
    }) as unknown as MovementEntity;

  it('returns the owner detail with embedded summaries and public state links', async () => {
    queries.findOwnerDetail.mockResolvedValue(detailEntity());

    const result = await service.findOne('user-public-id', 'movement-public-id');

    expect(queries.findOwnerDetail).toHaveBeenCalledWith(42, 'movement-public-id');
    expect(result).toMatchObject({
      publicId: 'movement-public-id',
      account: {publicId: 'source-account'},
      category: {publicId: 'root-category'},
      reversalOfPublicId: 'original-public-id',
      replacesPublicId: 'replaced-public-id',
      scheduledTransactionPublicId: 'schedule-public-id',
    });
    expect(Object.keys(result)).not.toEqual(
      expect.arrayContaining(['id', 'userId', 'accountId', 'categoryId']),
    );
  });

  it('throws MOVEMENT_NOT_FOUND when the detail is missing or not owned', async () => {
    queries.findOwnerDetail.mockResolvedValue(null);

    await expect(service.findOne('user-public-id', 'missing')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.MOVEMENT_NOT_FOUND.toString(),
    });
  });

  it('rejects an inactive user before reading the detail', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.findOne('user-public-id', 'movement-public-id')).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(queries.findOwnerDetail).not.toHaveBeenCalled();
  });

  it('rejects an inactive user before listing', async () => {
    profile.findActiveByPublicId.mockResolvedValue(null);

    await expect(service.list('user-public-id', {limit: 20} as ListMovementsQueryDto)).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
      code: ApiErrorCodeEnum.NOT_FOUND.toString(),
    });
    expect(queries.list).not.toHaveBeenCalled();
  });

  describe('update (US-504)', () => {
    const editResult = () => ({
      status: MovementWriteStatusEnum.UPDATED.toString(),
      movement: {...detailEntity(), amount: 5000, note: 'Mercado', version: 1},
      account: account(),
      targetAccount: null,
      category: category(),
      balances: [{accountPublicId: 'source-account', currentBalance: 95000, version: 1}],
    });

    beforeEach(() => {
      queries.findOwnerDetail.mockResolvedValue(detailEntity());
    });

    it('passes the partial edit to the transactional repository', async () => {
      updates.update.mockResolvedValue(editResult());

      const result = await service.update('user-public-id', 'movement-public-id', {
        amount: 5000,
        note: 'Mercado',
        version: 0,
      });

      expect(updates.update).toHaveBeenCalledWith(42, 'movement-public-id', {
        amount: 5000,
        note: 'Mercado',
        version: 0,
      });
      expect(result.movement).toMatchObject({amount: 5000, note: 'Mercado', version: 1});
      expect(result.balances).toEqual([
        {accountPublicId: 'source-account', currentBalance: 95000, version: 1},
      ]);
    });

    it('returns MOVEMENT_NOT_FOUND before writing when the movement is not owned', async () => {
      queries.findOwnerDetail.mockResolvedValue(null);

      await expect(
        service.update('user-public-id', 'missing', {amount: 5000}),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        code: ApiErrorCodeEnum.MOVEMENT_NOT_FOUND.toString(),
      });
      expect(updates.update).not.toHaveBeenCalled();
    });

    it('rejects an attempted date mutation with details.fields.date', async () => {
      await expect(
        service.update('user-public-id', 'movement-public-id', {
          amount: 5000,
          date: '2026-11-16T10:00:00.000Z',
        } as never),
      ).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        code: ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
        details: {fields: {date: expect.any(String)}},
      });
      expect(updates.update).not.toHaveBeenCalled();
    });

    it('dispatches a different type to the atomic replace repository', async () => {
      replacements.replace.mockResolvedValue({
        ...editResult(),
        status: MovementWriteStatusEnum.REPLACED.toString(),
        movement: {...detailEntity(), publicId: 'replacement-public-id', version: 0},
        replacedPublicId: 'movement-public-id',
      });

      const result = await service.update('user-public-id', 'movement-public-id', {
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 5000,
        version: 0,
      });

      expect(replacements.replace).toHaveBeenCalledWith(42, 'movement-public-id', {
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 5000,
        version: 0,
      });
      expect(updates.update).not.toHaveBeenCalled();
      expect(result.replacedPublicId).toBe('movement-public-id');
      expect(result.movement.publicId).toBe('replacement-public-id');
    });

    it('maps a scheduled movement type change to 409 MOVEMENT_LOCKED', async () => {
      replacements.replace.mockResolvedValue({
        status: MovementWriteStatusEnum.LOCKED.toString(),
      });

      await expect(
        service.update('user-public-id', 'movement-public-id', {
          type: MovementTypeEnum.EXPENSE.toString(),
        }),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        code: ApiErrorCodeEnum.MOVEMENT_LOCKED.toString(),
      });
    });

    it('maps stale versions to 409 VERSION_CONFLICT with both versions', async () => {
      updates.update.mockResolvedValue({
        status: MovementWriteStatusEnum.CONFLICT.toString(),
        expectedVersion: 0,
        currentVersion: 2,
      });

      await expect(
        service.update('user-public-id', 'movement-public-id', {amount: 5000, version: 0}),
      ).rejects.toMatchObject({
        status: HttpStatus.CONFLICT,
        code: ApiErrorCodeEnum.VERSION_CONFLICT.toString(),
        details: {expectedVersion: 0, currentVersion: 2},
      });
    });

    it.each([
      [
        MovementWriteStatusEnum.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ApiErrorCodeEnum.NOT_FOUND,
      ],
      [
        MovementWriteStatusEnum.LOCKED,
        HttpStatus.CONFLICT,
        ApiErrorCodeEnum.MOVEMENT_LOCKED,
      ],
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
    ] as const)('maps %s to %s %s', async (status, httpStatus, code) => {
      updates.update.mockResolvedValue({status: status.toString()});

      await expect(
        service.update('user-public-id', 'movement-public-id', {amount: 5000}),
      ).rejects.toMatchObject({status: httpStatus, code: code.toString()});
    });

    it('rejects an inactive user before reading or writing', async () => {
      profile.findActiveByPublicId.mockResolvedValue(null);

      await expect(
        service.update('user-public-id', 'movement-public-id', {amount: 5000}),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        code: ApiErrorCodeEnum.NOT_FOUND.toString(),
      });
      expect(queries.findOwnerDetail).not.toHaveBeenCalled();
      expect(updates.update).not.toHaveBeenCalled();
    });
  });

  describe('remove (US-506)', () => {
    it('returns the retired public id and the refreshed balances', async () => {
      deletions.delete.mockResolvedValue({
        status: MovementWriteStatusEnum.DELETED.toString(),
        deletedPublicId: 'movement-public-id',
        balances: [{accountPublicId: 'source-account', currentBalance: 97000, version: 1}],
      });

      const result = await service.remove('user-public-id', 'movement-public-id');

      expect(deletions.delete).toHaveBeenCalledWith(42, 'movement-public-id');
      expect(result).toEqual({
        deletedPublicId: 'movement-public-id',
        balances: [{accountPublicId: 'source-account', currentBalance: 97000, version: 1}],
      });
    });

    it.each([
      [
        MovementWriteStatusEnum.NOT_FOUND,
        HttpStatus.NOT_FOUND,
        ApiErrorCodeEnum.MOVEMENT_NOT_FOUND,
      ],
      [MovementWriteStatusEnum.LOCKED, HttpStatus.CONFLICT, ApiErrorCodeEnum.MOVEMENT_LOCKED],
      [
        MovementWriteStatusEnum.NEGATIVE_BALANCE,
        HttpStatus.CONFLICT,
        ApiErrorCodeEnum.NEGATIVE_BALANCE_NOT_ALLOWED,
      ],
      [MovementWriteStatusEnum.PERIOD_CLOSED, HttpStatus.CONFLICT, ApiErrorCodeEnum.PERIOD_CLOSED],
    ] as const)('maps %s to %s %s', async (status, httpStatus, code) => {
      deletions.delete.mockResolvedValue({status: status.toString()});

      await expect(
        service.remove('user-public-id', 'movement-public-id'),
      ).rejects.toMatchObject({status: httpStatus, code: code.toString()});
    });

    it('rejects an inactive user before touching the ledger', async () => {
      profile.findActiveByPublicId.mockResolvedValue(null);

      await expect(
        service.remove('user-public-id', 'movement-public-id'),
      ).rejects.toMatchObject({
        status: HttpStatus.NOT_FOUND,
        code: ApiErrorCodeEnum.NOT_FOUND.toString(),
      });
      expect(deletions.delete).not.toHaveBeenCalled();
    });
  });
});

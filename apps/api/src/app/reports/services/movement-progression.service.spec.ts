import {MovementTypeEnum} from '@peco/enums';
import {ApiException} from '../../common/http/api-exception';
import {UtcClock} from '../../database/clock/utc-clock';
import type {UserEntity} from '../../database/entities';
import {UserProfileRepository} from '../../users/services/user-profile.repository';
import type {MovementProgressionRow} from '../types/movement-progression-row.type';
import {MovementProgressionRepository} from './movement-progression.repository';
import {MovementProgressionService} from './movement-progression.service';

const NOW = '2026-11-05T10:00:00.000Z';
const USER_PUBLIC_ID = 'user-public-id';

const row = (
  id: number,
  type: string,
  amount: number,
  date: string,
  overrides: Partial<MovementProgressionRow> = {},
): MovementProgressionRow =>
  ({
    id,
    date,
    type: type as MovementProgressionRow['type'],
    amount,
    isCanceled: false,
    isReversal: false,
    isReversed: false,
    ...overrides,
  }) as MovementProgressionRow;

describe('MovementProgressionService (US-803)', () => {
  let users: {findActiveByPublicId: jest.Mock};
  let progression: {findSnapshot: jest.Mock; findPeriodMovements: jest.Mock};
  let service: MovementProgressionService;

  beforeEach(() => {
    users = {findActiveByPublicId: jest.fn().mockResolvedValue({id: 7} as UserEntity)};
    progression = {
      findSnapshot: jest.fn().mockResolvedValue(null),
      findPeriodMovements: jest.fn().mockResolvedValue([]),
    };
    service = new MovementProgressionService(
      users as unknown as UserProfileRepository,
      progression as unknown as MovementProgressionRepository,
      {now: () => NOW} as UtcClock,
    );
  });

  it('uses the frozen totals for a closed month with the default reversal policy', async () => {
    progression.findSnapshot.mockResolvedValue({
      id: 3,
      totalInflows: 50_000,
      totalOutflows: 20_000,
    });
    progression.findPeriodMovements.mockResolvedValue([
      row(1, MovementTypeEnum.INCOME.toString(), 50_000, '2026-09-05T10:00:00.000Z'),
      row(2, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-09-12T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-09');

    expect(users.findActiveByPublicId).toHaveBeenCalledWith(USER_PUBLIC_ID);
    expect(progression.findSnapshot).toHaveBeenCalledWith(7, '2026-09');
    expect(progression.findPeriodMovements).toHaveBeenCalledWith(7, '2026-09');
    expect(result.period).toBe('2026-09');
    expect(result.points).toHaveLength(30);
    expect(result.points[0]).toEqual({date: '2026-09-01', net: 0});
    expect(result.points[4]).toEqual({date: '2026-09-05', net: 50_000});
    expect(result.points[11]).toEqual({date: '2026-09-12', net: 30_000});
    expect(result.points[29]).toEqual({date: '2026-09-30', net: 30_000});
    expect(result.totals).toEqual({totalIncome: 50_000, totalExpenses: 20_000, netBalance: 30_000});
  });

  it('derives the totals from the ledger for the current month', async () => {
    progression.findPeriodMovements.mockResolvedValue([
      row(1, MovementTypeEnum.INCOME.toString(), 30_000, '2026-11-02T10:00:00.000Z'),
      row(2, MovementTypeEnum.EXPENSE.toString(), 10_000, '2026-11-04T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-11');

    expect(progression.findSnapshot).not.toHaveBeenCalled();
    expect(result.points).toHaveLength(30);
    expect(result.points[1]).toEqual({date: '2026-11-02', net: 30_000});
    expect(result.points[3]).toEqual({date: '2026-11-04', net: 20_000});
    expect(result.points[29].net).toBe(20_000);
    expect(result.totals).toEqual({totalIncome: 30_000, totalExpenses: 10_000, netBalance: 20_000});
  });

  it('omits both sides of a reversal pair when requested', async () => {
    progression.findPeriodMovements.mockResolvedValue([
      row(1, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-02T10:00:00.000Z', {
        isReversed: true,
      }),
      row(2, MovementTypeEnum.INCOME.toString(), 20_000, '2026-11-03T10:00:00.000Z', {
        isReversal: true,
      }),
      row(3, MovementTypeEnum.INCOME.toString(), 10_000, '2026-11-04T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-11', true);

    expect(progression.findSnapshot).not.toHaveBeenCalled();
    expect(result.points[1]).toEqual({date: '2026-11-02', net: 0});
    expect(result.points[2]).toEqual({date: '2026-11-03', net: 0});
    expect(result.points[3]).toEqual({date: '2026-11-04', net: 10_000});
    expect(result.totals).toEqual({totalIncome: 10_000, totalExpenses: 0, netBalance: 10_000});
  });

  it('falls back to the ledger when a closed month has no snapshot', async () => {
    progression.findPeriodMovements.mockResolvedValue([
      row(1, MovementTypeEnum.INCOME.toString(), 15_000, '2026-09-08T10:00:00.000Z'),
    ]);

    const result = await service.find(USER_PUBLIC_ID, '2026-09');

    expect(progression.findSnapshot).toHaveBeenCalledWith(7, '2026-09');
    expect(result.points[29].net).toBe(15_000);
    expect(result.totals).toEqual({totalIncome: 15_000, totalExpenses: 0, netBalance: 15_000});
  });

  it('answers 404 for an inactive or foreign user without reading the ledger', async () => {
    users.findActiveByPublicId.mockResolvedValue(null);

    const error = await service
      .find('foreign-public-id', '2026-11')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
    expect(progression.findSnapshot).not.toHaveBeenCalled();
    expect(progression.findPeriodMovements).not.toHaveBeenCalled();
  });
});

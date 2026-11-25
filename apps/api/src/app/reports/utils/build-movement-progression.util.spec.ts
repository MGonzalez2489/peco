import {MovementTypeEnum} from '@peco/enums';
import type {MovementProgressionRow} from '../types/movement-progression-row.type';
import {buildMovementProgression} from './build-movement-progression.util';

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

describe('buildMovementProgression (US-803)', () => {
  it('emits one point per UTC day, carries the net forward and ignores transfers/cancellations', () => {
    const {points, totals} = buildMovementProgression('2024-02', [
      row(1, MovementTypeEnum.INCOME.toString(), 100_000, '2024-02-03T10:00:00.000Z'),
      row(2, MovementTypeEnum.EXPENSE.toString(), 40_000, '2024-02-05T10:00:00.000Z'),
      row(3, MovementTypeEnum.INCOME.toString(), 999_999, '2024-02-06T10:00:00.000Z', {
        isCanceled: true,
      }),
      row(4, MovementTypeEnum.TRANSFER.toString(), 500_000, '2024-02-07T10:00:00.000Z'),
    ], false);

    expect(points).toHaveLength(29);
    expect(points[0]).toEqual({date: '2024-02-01', net: 0});
    expect(points[2]).toEqual({date: '2024-02-03', net: 100_000});
    expect(points[4]).toEqual({date: '2024-02-05', net: 60_000});
    expect(points[5]).toEqual({date: '2024-02-06', net: 60_000});
    expect(points[6]).toEqual({date: '2024-02-07', net: 60_000});
    expect(points[28]).toEqual({date: '2024-02-29', net: 60_000});
    expect(totals).toEqual({totalIncome: 100_000, totalExpenses: 40_000, netBalance: 60_000});
  });

  it('keeps a reversal pair with zero net when reversals are included', () => {
    const {points, totals} = buildMovementProgression('2026-11', [
      row(1, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-02T10:00:00.000Z', {
        isReversed: true,
      }),
      row(2, MovementTypeEnum.INCOME.toString(), 20_000, '2026-11-03T10:00:00.000Z', {
        isReversal: true,
      }),
    ], false);

    expect(points[1]).toEqual({date: '2026-11-02', net: -20_000});
    expect(points[2]).toEqual({date: '2026-11-03', net: 0});
    expect(totals).toEqual({totalIncome: 20_000, totalExpenses: 20_000, netBalance: 0});
  });

  it('omits both sides of a reversal pair and uses the frozen totals when requested', () => {
    const {points, totals} = buildMovementProgression(
      '2026-11',
      [
        row(1, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-02T10:00:00.000Z', {
          isReversed: true,
        }),
        row(2, MovementTypeEnum.INCOME.toString(), 20_000, '2026-11-03T10:00:00.000Z', {
          isReversal: true,
        }),
        row(3, MovementTypeEnum.INCOME.toString(), 50_000, '2026-11-04T10:00:00.000Z'),
      ],
      true,
      {totalInflows: 60_000, totalOutflows: 0},
    );

    expect(points[1]).toEqual({date: '2026-11-02', net: 0});
    expect(points[2]).toEqual({date: '2026-11-03', net: 0});
    expect(points[3]).toEqual({date: '2026-11-04', net: 50_000});
    expect(points[29].net).toBe(60_000);
    expect(totals).toEqual({totalIncome: 60_000, totalExpenses: 0, netBalance: 60_000});
  });
});

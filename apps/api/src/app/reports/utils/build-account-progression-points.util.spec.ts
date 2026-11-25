import {MovementTypeEnum} from '@peco/enums';
import type {PeriodLedgerMovement} from '../../periods/types/period-ledger-movement.type';
import {buildAccountProgressionPoints} from './build-account-progression-points.util';

const movement = (
  id: number,
  type: string,
  amount: number,
  date: string,
  overrides: Partial<PeriodLedgerMovement> = {},
): PeriodLedgerMovement =>
  ({
    id,
    date,
    type: type as PeriodLedgerMovement['type'],
    amount,
    accountId: 1,
    targetAccountId: null,
    isCanceled: false,
    ...overrides,
  }) as PeriodLedgerMovement;

describe('buildAccountProgressionPoints (US-802)', () => {
  it('starts with the opening point and appends one point per effective movement', () => {
    const points = buildAccountProgressionPoints(
      '2026-11',
      1,
      100_000,
      150_000,
      [
        movement(1, MovementTypeEnum.INCOME.toString(), 70_000, '2026-11-12T10:00:00.000Z'),
        movement(2, MovementTypeEnum.EXPENSE.toString(), 20_000, '2026-11-12T12:00:00.000Z', {
          isCanceled: true,
        }),
      ],
    );

    expect(points).toEqual([
      {date: '2026-11-01', balance: 100_000},
      {date: '2026-11-12', balance: 150_000},
    ]);
  });

  it('includes transfer impacts on the target account and aligns the final point', () => {
    const points = buildAccountProgressionPoints(
      '2026-11',
      2,
      50_000,
      90_000,
      [
        movement(
          1,
          MovementTypeEnum.TRANSFER.toString(),
          40_000,
          '2026-11-06T10:00:00.000Z',
          {accountId: 1, targetAccountId: 2},
        ),
      ],
    );

    expect(points).toEqual([
      {date: '2026-11-01', balance: 50_000},
      {date: '2026-11-06', balance: 90_000},
    ]);
  });

  it('keeps a single opening point when no movement touches the account', () => {
    expect(buildAccountProgressionPoints('2026-11', 1, 100_000, 100_000, [])).toEqual([
      {date: '2026-11-01', balance: 100_000},
    ]);
  });
});

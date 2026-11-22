import {MovementTypeEnum} from '@peco/enums';
import {movementBalanceImpact} from './movement-balance-impact.util';

describe('movementBalanceImpact (9.2/US-508)', () => {
  it('applies the signed impact of an active movement', () => {
    expect([...movementBalanceImpact(MovementTypeEnum.INCOME.toString(), 1000, 1, null)]).toEqual([
      [1, 1000],
    ]);
    expect([...movementBalanceImpact(MovementTypeEnum.EXPENSE.toString(), 1000, 1, null)]).toEqual([
      [1, -1000],
    ]);
    expect([
      ...movementBalanceImpact(MovementTypeEnum.TRANSFER.toString(), 1000, 1, 2),
    ]).toEqual([
      [1, -1000],
      [2, 1000],
    ]);
  });

  it('returns zero impact for a canceled movement on every account', () => {
    for (const type of Object.values(MovementTypeEnum)) {
      expect([...movementBalanceImpact(type.toString(), 1000, 1, 2, true)]).toEqual([]);
    }
  });
});

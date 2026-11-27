import {Movement} from '../models/movement.model';
import {MovementTotals} from '../models/movement-totals.model';
import {MovementTypeEnum} from '@peco/enums';

export const calculateMovementTotals = (movements: readonly Movement[]): MovementTotals => {
  const {totalIncome, totalExpenses} = movements.reduce(
    (accumulator, movement) => {
      if (movement.type === MovementTypeEnum.INCOME.toString())
        accumulator.totalIncome += movement.amount;
      if (movement.type === MovementTypeEnum.EXPENSE.toString())
        accumulator.totalExpenses += movement.amount;
      return accumulator;
    },
    {totalIncome: 0, totalExpenses: 0},
  );

  return {totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses};
};

import {Movement} from '../models/movement.model';
import {MovementTotals} from '../models/movement-totals.model';

export const calculateMovementTotals = (movements: readonly Movement[]): MovementTotals => {
  const {totalIncome, totalExpenses} = movements.reduce(
    (accumulator, movement) => {
      if (movement.type === 'INCOME') accumulator.totalIncome += movement.amount;
      if (movement.type === 'EXPENSE') accumulator.totalExpenses += movement.amount;
      return accumulator;
    },
    {totalIncome: 0, totalExpenses: 0},
  );

  return {totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses};
};

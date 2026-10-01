import {Movement} from '../models/movement.model';
import {MovementGroup} from '../models/movement-group.model';
import {formatLocalDate} from './format-local-date.util';

export const groupMovementsByDate = (movements: readonly Movement[]): MovementGroup[] => {
  const groups: MovementGroup[] = [];

  for (const movement of movements) {
    const date = formatLocalDate(movement.date);
    const last = groups[groups.length - 1];

    if (last && last.date === date) {
      last.movements.push(movement);
    } else {
      groups.push({date, movements: [movement]});
    }
  }

  return groups;
};

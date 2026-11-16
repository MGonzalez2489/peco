import {Movement} from '../models/movement.model';
import {isReversalMovement} from './is-reversal-movement.util';
import {toLocalIsoDay} from './to-local-iso-day.util';
import {todayIsoDate} from './today-iso-date.util';

const LOCKED_MESSAGE = 'Los movimientos reversados u omitidos no se pueden editar.';
const NOT_TODAY_MESSAGE = 'Solo se pueden editar movimientos registrados el día de hoy.';

type EditableMovement = Pick<Movement, 'date' | 'isReversal' | 'isCanceled' | 'reversalId'>;

/**
 * Audit guard for the movement editing window.
 *
 * Returns the Spanish message that explains why a movement cannot be edited,
 * or `null` when it is still editable. Only same-day movements can be edited
 * directly; historical corrections must go through the reversal flow.
 */
export const movementEditBlockMessage = (
  movement: EditableMovement,
  today: string = todayIsoDate(),
): string | null => {
  if (isReversalMovement(movement) || movement.isCanceled) return LOCKED_MESSAGE;
  if (toLocalIsoDay(movement.date) !== today) return NOT_TODAY_MESSAGE;
  return null;
};

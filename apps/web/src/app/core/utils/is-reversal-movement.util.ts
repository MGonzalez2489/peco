import {Movement} from '../models/movement.model';

/**
 * A movement belongs to the reversal flow when it was reverted — the original
 * record is flagged with `isReversal` — or when it is the contra-movement
 * created to revert it, which points back to the original through
 * `reversalId`. Both sides of the pair are hidden together.
 */
export const isReversalMovement = (
  movement: Pick<Movement, 'isReversal' | 'reversalId'>,
): boolean => Boolean(movement.isReversal) || Boolean(movement.reversalId);

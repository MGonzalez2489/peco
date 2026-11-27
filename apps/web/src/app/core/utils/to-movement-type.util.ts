import {MovementType} from '../types/movement-type.type';
import {ScheduledTransactionTypeKey} from '../types/scheduled-transaction-type-key.type';

export const toMovementType = (key: ScheduledTransactionTypeKey): MovementType =>
  key as MovementType;

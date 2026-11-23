import {ValidateBy, type ValidationOptions} from 'class-validator';
import {decodeScheduledTransactionCursor} from '../utils/decode-scheduled-transaction-cursor.util';

/** Rejects opaque cursors the keyset query cannot decode (8.4/US-602). */
export const IsScheduledTransactionCursor = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'scheduledTransactionCursor',
      validator: {
        validate: (value: unknown): boolean =>
          value === undefined ||
          value === null ||
          (typeof value === 'string' && decodeScheduledTransactionCursor(value) !== null),
        defaultMessage: (): string => 'El cursor no es válido.',
      },
    },
    options,
  );

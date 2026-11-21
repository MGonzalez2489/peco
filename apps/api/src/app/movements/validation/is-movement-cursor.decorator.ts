import {ValidateBy, type ValidationOptions} from 'class-validator';
import {decodeMovementCursor} from '../utils/decode-movement-cursor.util';

/** Rejects opaque cursors the keyset query cannot decode (8.4/US-502). */
export const IsMovementCursor = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'movementCursor',
      validator: {
        validate: (value: unknown): boolean =>
          value === undefined ||
          value === null ||
          (typeof value === 'string' && decodeMovementCursor(value) !== null),
        defaultMessage: (): string => 'El cursor no es válido.',
      },
    },
    options,
  );

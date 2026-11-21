import {ValidateBy, type ValidationArguments, type ValidationOptions} from 'class-validator';
import {addMonthsToDate} from '../utils/add-months-to-date.util';

const MAX_RANGE_MONTHS = 24;

/** An explicit `from`/`to` range may never span more than 24 months (8.4/Q8). */
export const IsMovementDateRange = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'movementDateRange',
      validator: {
        validate: (value: unknown, args?: ValidationArguments): boolean => {
          if (typeof value !== 'string' || value.length === 0) {
            return true;
          }
          const query = args?.object as {from?: unknown} | undefined;
          if (typeof query?.from !== 'string' || query.from.length === 0) {
            return true;
          }

          return value <= addMonthsToDate(query.from, MAX_RANGE_MONTHS);
        },
        defaultMessage: (): string => 'El rango no puede superar los 24 meses.',
      },
    },
    options,
  );

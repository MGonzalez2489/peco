import {ValidateBy, type ValidationArguments, type ValidationOptions} from 'class-validator';

const hasDateRange = (args?: ValidationArguments): boolean => {
  const query = args?.object as {from?: unknown; to?: unknown} | undefined;

  return !!query && (query.from !== undefined || query.to !== undefined);
};

/** `period` and `from`/`to` are mutually exclusive (8.4). */
export const IsMovementPeriodExclusive = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'movementPeriodExclusive',
      validator: {
        validate: (value: unknown, args?: ValidationArguments): boolean =>
          value === undefined || value === null || !hasDateRange(args),
        defaultMessage: (): string => 'El período no se puede combinar con un rango de fechas.',
      },
    },
    options,
  );

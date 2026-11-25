import {ValidateBy, type ValidationArguments, type ValidationOptions} from 'class-validator';

const hasRange = (args?: ValidationArguments): boolean => {
  const query = args?.object as {from?: unknown; to?: unknown} | undefined;

  return !!query && (query.from !== undefined || query.to !== undefined);
};

/** `period` and `from`/`to` are mutually exclusive on every report (8.4). */
export const IsReportPeriodSelection = (options?: ValidationOptions): PropertyDecorator =>
  ValidateBy(
    {
      name: 'reportPeriodSelection',
      validator: {
        validate: (value: unknown, args?: ValidationArguments): boolean =>
          value === undefined || value === null || !hasRange(args),
        defaultMessage: (): string => 'El período no se puede combinar con un rango de meses.',
      },
    },
    options,
  );

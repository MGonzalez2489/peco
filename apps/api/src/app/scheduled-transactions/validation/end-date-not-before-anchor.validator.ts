import {registerDecorator, type ValidationArguments, type ValidationOptions} from 'class-validator';

/** Cross-field rule for schedule creation: `endDate` cannot precede `anchorDate` (8.11/US-601). */
export const IsEndDateNotBeforeAnchor =
  (validationOptions?: ValidationOptions): PropertyDecorator =>
  (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'endDateNotBeforeAnchor',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null) {
            return true;
          }

          const schedule = args.object as {anchorDate?: unknown};

          return (
            typeof schedule.anchorDate === 'string' &&
            typeof value === 'string' &&
            value >= schedule.anchorDate
          );
        },
      },
    });
  };

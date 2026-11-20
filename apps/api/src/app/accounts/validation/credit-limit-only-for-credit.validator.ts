import {AccountTypeEnum} from '@peco/enums';
import {registerDecorator, type ValidationArguments, type ValidationOptions} from 'class-validator';

/**
 * Cross-field rule for account writes: a non-null `creditLimit` only makes
 * sense for a CREDIT account (US-302/US-303). `null` is accepted for every type.
 */
export const IsCreditLimitOnlyForCredit =
  (validationOptions?: ValidationOptions): PropertyDecorator =>
  (object: object, propertyName: string | symbol): void => {
    registerDecorator({
      name: 'creditLimitOnlyForCredit',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          if (value === undefined || value === null) {
            return true;
          }

          const account = args.object as {type?: unknown};

          return account.type === AccountTypeEnum.CREDIT.toString();
        },
      },
    });
  };

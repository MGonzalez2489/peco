import {ApiErrorCodeEnum} from '@peco/enums';
import {ValidationError} from 'class-validator';
import {API_ERROR_MESSAGES} from '../http/api-error-messages.constant';
import {ApiException} from '../http/api-exception';
import {
  VALIDATION_FIELD_FALLBACK_MESSAGE,
  VALIDATION_FIELD_MESSAGES,
} from './validation-field-messages.constant';

/**
 * When several constraints fail for the same property, the most specific
 * message wins: a type error is more useful than "out of range" (a string
 * amount fails both `isInt` and `min`).
 */
const CONSTRAINT_PRIORITY: readonly string[] = [
  'whitelistValidation',
  'isDefined',
  'isNotEmpty',
  'isString',
  'isInt',
  'isNumber',
  'isBoolean',
  'isArray',
  'isObject',
  'isEmail',
  'isUUID',
  'isEnum',
  'isIn',
  'isDateString',
  'isNumberString',
  'matches',
  'minLength',
  'maxLength',
  'min',
  'max',
  'minDate',
  'maxDate',
  'arrayNotEmpty',
];

const firstConstraint = (error: ValidationError): string | undefined => {
  const constraints = error.constraints ? Object.keys(error.constraints) : [];

  if (constraints.length === 0) {
    return undefined;
  }

  const rank = (constraint: string): number => {
    const index = CONSTRAINT_PRIORITY.indexOf(constraint);

    return index === -1 ? CONSTRAINT_PRIORITY.length : index;
  };

  return [...constraints].sort((left, right) => rank(left) - rank(right))[0];
};

const flatten = (
  errors: readonly ValidationError[],
  parentPath?: string,
  fields: Record<string, string> = {},
): Record<string, string> => {
  for (const error of errors) {
    const path = parentPath ? `${parentPath}.${error.property}` : error.property;
    const constraint = firstConstraint(error);

    if (constraint) {
      fields[path] = VALIDATION_FIELD_MESSAGES[constraint] ?? VALIDATION_FIELD_FALLBACK_MESSAGE;
    }

    if (error.children?.length) {
      flatten(error.children, path, fields);
    }
  }

  return fields;
};

/** Builds `400 VALIDATION_ERROR` with `details.fields` from class-validator errors. */
export const validationExceptionFactory = (errors: ValidationError[]): ApiException =>
  new ApiException(
    400,
    ApiErrorCodeEnum.VALIDATION_ERROR.toString(),
    API_ERROR_MESSAGES.VALIDATION_ERROR,
    {
      fields: flatten(errors),
    },
  );

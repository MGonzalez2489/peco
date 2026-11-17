/**
 * Spanish message per `class-validator` constraint. `details.fields` is a map of
 * property -> message (8.15), so only the first constraint of each property is
 * reported.
 */
export const VALIDATION_FIELD_MESSAGES: Readonly<Record<string, string>> = {
  whitelistValidation: 'El campo no está permitido.',
  isDefined: 'Este campo es obligatorio.',
  isNotEmpty: 'Este campo es obligatorio.',
  isString: 'Debe ser texto.',
  isEmail: 'Debe ser un correo válido.',
  isInt: 'Debe ser un número entero.',
  isNumber: 'Debe ser un número.',
  isBoolean: 'Debe ser verdadero o falso.',
  isArray: 'Debe ser una lista.',
  isObject: 'Debe ser un objeto.',
  isUUID: 'Debe ser un identificador válido.',
  isEnum: 'El valor no está permitido.',
  isIn: 'El valor no está permitido.',
  isPositive: 'Debe ser mayor que cero.',
  isDateString: 'Debe ser una fecha válida.',
  minLength: 'La longitud no es válida.',
  maxLength: 'La longitud no es válida.',
  min: 'El valor está fuera del rango permitido.',
  max: 'El valor está fuera del rango permitido.',
  minDate: 'La fecha está fuera del rango permitido.',
  maxDate: 'La fecha está fuera del rango permitido.',
  matches: 'El formato no es válido.',
  arrayNotEmpty: 'La lista no puede estar vacía.',
  isNumberString: 'Debe ser un número.',
};

/** Message used when the constraint has no Spanish translation yet. */
export const VALIDATION_FIELD_FALLBACK_MESSAGE = 'El valor no es válido.';

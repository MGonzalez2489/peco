import {ValidationPipe} from '@nestjs/common';
import {validationExceptionFactory} from './validation-exception.factory';

/**
 * Global validation pipe (8.15): strips unknown properties, rejects them
 * explicitly, never coerces types silently and reports `details.fields`.
 */
export const createValidationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {enableImplicitConversion: false},
    validationError: {target: false, value: false},
    exceptionFactory: validationExceptionFactory,
  });

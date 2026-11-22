import {ApiHeader} from '@nestjs/swagger';

/** Documents the required idempotency header on mutation routes (8.5). */
export const ApiIdempotencyKeyHeader = (): MethodDecorator & ClassDecorator =>
  ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Clave de idempotencia de 8 a 128 caracteres.',
  });

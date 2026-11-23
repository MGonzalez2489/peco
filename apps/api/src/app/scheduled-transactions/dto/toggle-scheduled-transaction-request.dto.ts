import type {ToggleScheduledTransactionRequest} from '@peco/contracts';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsBoolean, IsInt, Max, Min, ValidateIf} from 'class-validator';

/** Explicit active state; unknown fields are rejected by the global whitelist (8.11/US-603). */
export class ToggleScheduledTransactionRequestDto implements ToggleScheduledTransactionRequest {
  @ApiProperty({example: false, description: 'Estado explícito de la programación.'})
  @IsBoolean()
  active!: boolean;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: 'Versión esperada para el control optimista.',
  })
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  version?: number;
}

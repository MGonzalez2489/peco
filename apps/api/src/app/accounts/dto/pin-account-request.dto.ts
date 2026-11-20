import type {UpdateAccountPinRequest} from '@peco/contracts';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {IsBoolean, IsInt, Max, Min, ValidateIf} from 'class-validator';

/** Explicit pin state; unknown fields are rejected by the global whitelist (8.8/US-304). */
export class PinAccountRequestDto implements UpdateAccountPinRequest {
  @ApiProperty({example: true, description: 'Estado explícito de la cuenta fijada en el inicio.'})
  @IsBoolean()
  pinToHome!: boolean;

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

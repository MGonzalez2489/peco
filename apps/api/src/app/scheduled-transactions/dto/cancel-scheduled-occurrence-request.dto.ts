import type {CancelScheduledOccurrenceRequest} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsOptional, IsString, MaxLength} from 'class-validator';

/** Optional note copied to the canceled movement; the execution reason stays `USER_CANCELLED` (10.7/US-605). */
export class CancelScheduledOccurrenceRequestDto implements CancelScheduledOccurrenceRequest {
  @ApiPropertyOptional({
    example: 'Cancelada por el usuario',
    description: 'Nota opcional que se guarda en el movimiento cancelado.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

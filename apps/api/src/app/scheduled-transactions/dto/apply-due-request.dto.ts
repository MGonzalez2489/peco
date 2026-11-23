import type {ApplyDueRequest} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsDateString, IsOptional, Matches} from 'class-validator';

/** Date-only catch-up boundary; the service falls back to the current UTC date (8.11/US-606). */
export class ApplyDueRequestDto implements ApplyDueRequest {
  @ApiPropertyOptional({
    example: '2026-05-02',
    description: 'Fecha UTC límite; por defecto, hoy.',
  })
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  asOf?: string;
}

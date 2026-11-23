import type {ListDueSchedulesQuery} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsBoolean, IsDateString, IsOptional, Matches} from 'class-validator';

const booleanFilter = ({value}: {value: unknown}): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Read-only due preview filters; no writes are performed (8.11/US-606). */
export class DueSchedulesQueryDto implements ListDueSchedulesQuery {
  @ApiPropertyOptional({example: '2026-05-02', description: 'Fecha UTC límite; por defecto, hoy.'})
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  asOf?: string;

  @ApiPropertyOptional({example: true, description: 'Omitido incluye ambos valores.'})
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  autoApply?: boolean;
}

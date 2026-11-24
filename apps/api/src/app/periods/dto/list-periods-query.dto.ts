import type {ListPeriodsQuery} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsOptional, IsString, Matches} from 'class-validator';
import {IsPeriodRange} from '../validation/is-period-range.decorator';

const PERIOD_PATTERN = '^\\d{4}-(0[1-9]|1[0-2])$';

/** Inclusive month range for `GET /periods`; the API supplies the default window (8.12). */
export class ListPeriodsQueryDto implements ListPeriodsQuery {
  @ApiPropertyOptional({
    pattern: PERIOD_PATTERN,
    example: '2026-01',
    description: 'Primer mes UTC incluido; por defecto, 11 meses antes de `to`.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  from?: string;

  @ApiPropertyOptional({
    pattern: PERIOD_PATTERN,
    example: '2026-10',
    description: 'Último mes UTC incluido; por defecto, el mes anterior al actual.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  @IsPeriodRange()
  to?: string;
}

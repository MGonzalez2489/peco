import type {ReportPeriodQuery} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {IsOptional, IsString, Matches} from 'class-validator';
import {IsPeriodRange} from '../../periods/validation/is-period-range.decorator';
import {IsReportPeriodSelection} from '../validation/is-report-period-selection.decorator';

const PERIOD_PATTERN = '^\\d{4}-(0[1-9]|1[0-2])$';

/** Shared query contract for all report routes; omitting it selects the current UTC month (US-806). */
export class ReportPeriodQueryDto implements ReportPeriodQuery {
  @ApiPropertyOptional({
    pattern: PERIOD_PATTERN,
    example: '2026-11',
    description: 'Mes UTC del reporte; no se puede combinar con `from` o `to`.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  @IsReportPeriodSelection()
  period?: string;

  @ApiPropertyOptional({
    pattern: PERIOD_PATTERN,
    example: '2025-11',
    description: 'Primer mes UTC incluido en la ventana consultada.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  from?: string;

  @ApiPropertyOptional({
    pattern: PERIOD_PATTERN,
    example: '2026-11',
    description: 'Último mes UTC incluido; el rango no puede superar los 24 meses.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  @IsPeriodRange()
  to?: string;
}

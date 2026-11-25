import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsBoolean, IsOptional} from 'class-validator';
import {ReportPeriodQueryDto} from './report-period-query.dto';

const booleanFilter = ({value}: {value: unknown}): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Optional UTC month or bounded range plus the reversal filter (D41/US-806). */
export class MovementProgressionQueryDto extends ReportPeriodQueryDto {
  @ApiPropertyOptional({
    example: false,
    description: 'Oculta el original revertido y su contra; por defecto `false`.',
  })
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  excludeReversals?: boolean;
}

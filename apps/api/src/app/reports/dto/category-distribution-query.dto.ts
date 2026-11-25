import type {MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import {IsIn} from 'class-validator';
import {ReportPeriodQueryDto} from './report-period-query.dto';

const DISTRIBUTION_TYPES: readonly MovementType[] = [
  MovementTypeEnum.INCOME.toString(),
  MovementTypeEnum.EXPENSE.toString(),
];

/** Optional UTC month or bounded range plus the required income/expense filter (US-804/US-806). */
export class CategoryDistributionQueryDto extends ReportPeriodQueryDto {
  @ApiProperty({
    enum: DISTRIBUTION_TYPES,
    example: MovementTypeEnum.EXPENSE.toString(),
    description: 'Dirección de los movimientos a distribuir; `TRANSFER` no es válido.',
  })
  @IsIn(DISTRIBUTION_TYPES)
  type!: MovementType;
}

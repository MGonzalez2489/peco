import type {MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import {IsIn, IsString, Matches} from 'class-validator';

const DISTRIBUTION_TYPES: readonly MovementType[] = [
  MovementTypeEnum.INCOME.toString(),
  MovementTypeEnum.EXPENSE.toString(),
];

/** Validates the UTC month and the income/expense filter before any ledger read (US-804). */
export class CategoryDistributionQueryDto {
  @ApiProperty({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-11',
    description: 'Mes UTC del reporte.',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period!: string;

  @ApiProperty({
    enum: DISTRIBUTION_TYPES,
    example: MovementTypeEnum.EXPENSE.toString(),
    description: 'Dirección de los movimientos a distribuir; `TRANSFER` no es válido.',
  })
  @IsIn(DISTRIBUTION_TYPES)
  type!: MovementType;
}

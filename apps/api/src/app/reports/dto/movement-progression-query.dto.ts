import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsBoolean, IsOptional, IsString, Matches} from 'class-validator';

const booleanFilter = ({value}: {value: unknown}): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Validates the UTC month and the optional reversal filter before any ledger read (D41). */
export class MovementProgressionQueryDto {
  @ApiProperty({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-11',
    description: 'Mes UTC del reporte.',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Oculta el original revertido y su contra; por defecto `false`.',
  })
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  excludeReversals?: boolean;
}

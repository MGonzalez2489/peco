import {ApiProperty} from '@nestjs/swagger';
import {IsString, Matches} from 'class-validator';

/** Validates the UTC `YYYY-MM` route parameter before any period is read or closed. */
export class PeriodParamsDto {
  @ApiProperty({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-10',
    description: 'Mes UTC.',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period!: string;
}

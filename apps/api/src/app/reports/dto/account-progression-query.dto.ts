import {ApiProperty} from '@nestjs/swagger';
import {IsString, Matches} from 'class-validator';

/** Validates the UTC `YYYY-MM` period before any snapshot or ledger read. */
export class AccountProgressionQueryDto {
  @ApiProperty({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-11',
    description: 'Mes UTC del reporte.',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period!: string;
}

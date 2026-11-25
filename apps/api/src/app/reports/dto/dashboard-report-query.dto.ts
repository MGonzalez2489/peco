import {ApiProperty} from '@nestjs/swagger';
import {IsString, Matches} from 'class-validator';

/** Validates the UTC `YYYY-MM` report period before any ledger or snapshot read. */
export class DashboardReportQueryDto {
  @ApiProperty({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-11',
    description: 'Mes UTC del reporte.',
  })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period!: string;
}

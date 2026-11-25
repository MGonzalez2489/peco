import type {DashboardReportComparison} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Previous-period figures carried by the dashboard comparison (8.13/D39). */
export class DashboardReportComparisonDto implements DashboardReportComparison {
  @ApiProperty({example: '2026-10', description: 'Período anterior comparado.'})
  readonly period!: string;

  @ApiProperty({example: 280_000, description: 'Ingresos del período anterior, en centavos.'})
  readonly totalIncome!: number;

  @ApiProperty({example: 150_000, description: 'Gastos del período anterior, en centavos.'})
  readonly totalExpenses!: number;

  @ApiProperty({example: 130_000, description: 'Neto del período anterior, en centavos.'})
  readonly netBalance!: number;
}

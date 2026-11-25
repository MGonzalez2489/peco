import type {DashboardReportTotals} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Dashboard income, expense and count totals in integer cents (8.13). */
export class DashboardReportTotalsDto implements DashboardReportTotals {
  @ApiProperty({example: 300_000, description: 'Ingresos del período, en centavos.'})
  readonly totalIncome!: number;

  @ApiProperty({example: 145_000, description: 'Gastos del período, en centavos.'})
  readonly totalExpenses!: number;

  @ApiProperty({example: 155_000, description: 'Ingresos menos gastos, en centavos.'})
  readonly netBalance!: number;

  @ApiProperty({example: 18, description: 'Cantidad de movimientos del período.'})
  readonly transactionCount!: number;
}

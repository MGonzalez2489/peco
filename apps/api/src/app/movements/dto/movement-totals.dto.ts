import type {MovementTotals} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Whole-filter totals returned as `meta.totals` by `GET /movements` (8.10/D38/D101). */
export class MovementTotalsDto implements MovementTotals {
  @ApiProperty({description: 'Suma de ingresos con impacto en saldo, en centavos.'})
  readonly totalIncome: number;

  @ApiProperty({description: 'Suma de gastos con impacto en saldo, en centavos.'})
  readonly totalExpenses: number;

  @ApiProperty({description: 'Ingresos menos gastos, en centavos.'})
  readonly netBalance: number;

  @ApiProperty({description: 'Número distinto de movimientos del conjunto filtrado.'})
  readonly count: number;

  constructor(totals: MovementTotals) {
    this.totalIncome = totals.totalIncome;
    this.totalExpenses = totals.totalExpenses;
    this.netBalance = totals.netBalance;
    this.count = totals.count;
  }
}

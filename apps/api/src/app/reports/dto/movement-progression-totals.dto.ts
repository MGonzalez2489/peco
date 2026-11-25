import type {MovementProgressionTotals} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Movement progression totals in integer cents (8.13). */
export class MovementProgressionTotalsDto implements MovementProgressionTotals {
  @ApiProperty({example: 300_000, description: 'Ingresos del período, en centavos.'})
  readonly totalIncome!: number;

  @ApiProperty({example: 145_000, description: 'Gastos del período, en centavos.'})
  readonly totalExpenses!: number;

  @ApiProperty({example: 155_000, description: 'Ingresos menos gastos, en centavos.'})
  readonly netBalance!: number;
}

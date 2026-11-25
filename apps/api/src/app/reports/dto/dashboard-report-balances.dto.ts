import type {DashboardReportBalances} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Gross, available and liability balances shown by the dashboard (D62). */
export class DashboardReportBalancesDto implements DashboardReportBalances {
  @ApiProperty({example: 520_000, description: 'Suma de todos los saldos, en centavos.'})
  readonly totalBalance!: number;

  @ApiProperty({example: 400_000, description: 'Saldo disponible, en centavos.'})
  readonly availableBalance!: number;

  @ApiProperty({example: 120_000, description: 'Saldo de tarjetas de crédito, en centavos.'})
  readonly liabilitiesBalance!: number;
}

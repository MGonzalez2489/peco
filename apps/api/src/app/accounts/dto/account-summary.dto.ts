import type {AccountSummary} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountTypeSummaryDto} from './account-type-summary.dto';

/** Account totals returned as `meta.summary` by `GET /accounts` (D65). */
export class AccountSummaryDto implements AccountSummary {
  @ApiProperty({description: 'Suma de todos los saldos, incluidas las deudas.'})
  readonly totalBalance: number;

  @ApiProperty({description: 'Saldo disponible sin créditos ni cuentas excluidas.'})
  readonly availableBalance: number;

  @ApiProperty({description: 'Deuda positiva pendiente de las tarjetas de crédito.'})
  readonly liabilitiesBalance: number;

  @ApiProperty({
    description: 'Resumen por tipo; incluye siempre los cuatro tipos canónicos.',
    type: AccountTypeSummaryDto,
    isArray: true,
  })
  readonly typeSummaries: AccountTypeSummaryDto[];

  constructor(summary: AccountSummary) {
    this.totalBalance = summary.totalBalance;
    this.availableBalance = summary.availableBalance;
    this.liabilitiesBalance = summary.liabilitiesBalance;
    this.typeSummaries = summary.typeSummaries.map((item) => new AccountTypeSummaryDto(item));
  }
}

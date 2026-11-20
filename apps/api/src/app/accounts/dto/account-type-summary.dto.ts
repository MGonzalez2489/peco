import type {AccountTypeSummary} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Signed count and total for one account type (8.8). */
export class AccountTypeSummaryDto implements AccountTypeSummary {
  @ApiProperty({description: 'Tipo de cuenta.'})
  readonly type: AccountTypeSummary['type'];

  @ApiProperty({description: 'Número de cuentas de este tipo.'})
  readonly count: number;

  @ApiProperty({description: 'Suma firmada de los saldos en centavos.'})
  readonly total: number;

  constructor(summary: AccountTypeSummary) {
    this.type = summary.type;
    this.count = summary.count;
    this.total = summary.total;
  }
}

import type {AccountBalanceUpdate} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Balance and version for a card the client can refresh without another request (8.8). */
export class AccountBalanceUpdateDto implements AccountBalanceUpdate {
  @ApiProperty({description: 'Identificador público de la cuenta.'})
  readonly accountPublicId: string;

  @ApiProperty({description: 'Saldo actual en centavos.'})
  readonly currentBalance: number;

  @ApiProperty({description: 'Versión optimista resultante.'})
  readonly version: number;

  constructor(accountPublicId: string, currentBalance: number, version: number) {
    this.accountPublicId = accountPublicId;
    this.currentBalance = currentBalance;
    this.version = version;
  }
}

import type {AccountPeriodBalanceResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {AccountPeriodBalanceEntity} from '../../database/entities';

/** Frozen account row returned inside a period snapshot (8.12/D62). */
export class AccountPeriodBalanceResponseDto implements AccountPeriodBalanceResponse {
  @ApiProperty({description: 'Identificador público de la cuenta.'})
  readonly accountPublicId: string;

  @ApiProperty({description: 'Nombre congelado al cerrar el período.'})
  readonly accountName: string;

  @ApiProperty({description: 'Tipo de cuenta congelado al cerrar el período.'})
  readonly accountType: AccountPeriodBalanceResponse['accountType'];

  @ApiProperty({description: 'Color congelado al cerrar el período.', nullable: true})
  readonly color: string | null;

  @ApiProperty({description: 'Icono congelado al cerrar el período.', nullable: true})
  readonly icon: string | null;

  @ApiProperty({description: 'Saldo de apertura en centavos.'})
  readonly initialBalance: number;

  @ApiProperty({description: 'Saldo de cierre en centavos.'})
  readonly finalBalance: number;

  @ApiProperty({description: 'Movimientos que afectaron la cuenta; una transferencia cuenta dos veces.'})
  readonly totalTransactions: number;

  @ApiProperty({description: 'Ingresos contabilizados en la cuenta, en centavos.'})
  readonly totalInflows: number;

  @ApiProperty({description: 'Gastos contabilizados en la cuenta, en centavos.'})
  readonly totalOutflows: number;

  @ApiProperty({description: 'Impacto neto de transferencias en la cuenta, en centavos.'})
  readonly totalTransfers: number;

  constructor(balance: AccountPeriodBalanceEntity) {
    this.accountPublicId = balance.account.publicId;
    this.accountName = balance.accountName;
    this.accountType = balance.accountType;
    this.color = balance.color;
    this.icon = balance.icon;
    this.initialBalance = balance.initialBalance;
    this.finalBalance = balance.finalBalance;
    this.totalTransactions = balance.totalTransactions;
    this.totalInflows = balance.totalInflows;
    this.totalOutflows = balance.totalOutflows;
    this.totalTransfers = balance.totalTransfers;
  }
}

import type {PeriodSnapshotResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {AccountPeriodBalanceEntity, PeriodSnapshotEntity} from '../../database/entities';
import {AccountPeriodBalanceResponseDto} from './account-period-balance-response.dto';

/** Complete immutable snapshot plus its frozen per-account breakdown (8.12). */
export class PeriodSnapshotResponseDto implements PeriodSnapshotResponse {
  @ApiProperty({example: '2026-10', description: 'Mes UTC cerrado.'})
  readonly period: string;

  @ApiProperty({example: '2026-10-01'})
  readonly startDate: string;

  @ApiProperty({example: '2026-10-31'})
  readonly endDate: string;

  @ApiProperty({description: 'Suma de saldos de apertura, en centavos.'})
  readonly globalInitialBalance: number;

  @ApiProperty({description: 'Suma de saldos de cierre, en centavos.'})
  readonly globalFinalBalance: number;

  @ApiProperty({description: 'Ingresos del período, en centavos.'})
  readonly totalInflows: number;

  @ApiProperty({description: 'Gastos del período, en centavos.'})
  readonly totalOutflows: number;

  @ApiProperty({description: 'Impacto neto de transferencias; siempre cero en el total global.'})
  readonly totalTransfers: number;

  @ApiProperty({description: 'Movimientos distintos del período; una transferencia cuenta una vez.'})
  readonly totalTransactionsCount: number;

  @ApiProperty({description: 'Momento UTC en que se cerró; equivale a `createdAt`.'})
  readonly closedAt: string;

  @ApiProperty({type: AccountPeriodBalanceResponseDto, isArray: true})
  readonly accountBalances: AccountPeriodBalanceResponseDto[];

  constructor(snapshot: PeriodSnapshotEntity, balances: readonly AccountPeriodBalanceEntity[]) {
    this.period = snapshot.period;
    this.startDate = snapshot.startDate;
    this.endDate = snapshot.endDate;
    this.globalInitialBalance = snapshot.globalInitialBalance;
    this.globalFinalBalance = snapshot.globalFinalBalance;
    this.totalInflows = snapshot.totalInflows;
    this.totalOutflows = snapshot.totalOutflows;
    this.totalTransfers = snapshot.totalTransfers;
    this.totalTransactionsCount = snapshot.totalTransactionsCount;
    this.closedAt = snapshot.createdAt;
    this.accountBalances = [...balances]
      .sort((left, right) => left.accountId - right.accountId)
      .map((balance) => new AccountPeriodBalanceResponseDto(balance));
  }
}

import type {PeriodSummaryResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {PeriodSnapshotEntity} from '../../database/entities';

/** Frozen totals of a closed period, as returned by `GET /periods` (8.12). */
export class PeriodSummaryResponseDto implements PeriodSummaryResponse {
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

  constructor(snapshot: PeriodSnapshotEntity) {
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
  }
}

import type {ScheduledCommitmentsResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {CategoryDistributionItemDto} from './category-distribution-item.dto';

/** Public scheduled commitments in the D65 single-resource shape (8.13). */
export class ScheduledCommitmentsResponseDto implements ScheduledCommitmentsResponse {
  @ApiProperty({example: '2026-11', description: 'Mes UTC consultado.'})
  readonly period!: string;

  @ApiProperty({example: 500_000, description: 'Compromisos de ingreso, en centavos.'})
  readonly monthlyIncome!: number;

  @ApiProperty({example: 320_000, description: 'Compromisos de gasto, en centavos.'})
  readonly monthlyExpenses!: number;

  @ApiProperty({example: 180_000, description: 'Ingresos menos gastos, en centavos.'})
  readonly netProjectedImpact!: number;

  @ApiProperty({
    example: 580_000,
    description: 'Saldo disponible actual más el impacto neto proyectado, en centavos.',
  })
  readonly projectedAvailableBalance!: number;

  @ApiProperty({example: 64, description: 'Porcentaje de ingresos comprometido por gastos.'})
  readonly incomeCommitmentPercentage!: number;

  @ApiProperty({type: CategoryDistributionItemDto, isArray: true})
  readonly expenseDistribution!: CategoryDistributionItemDto[];

  @ApiProperty({type: CategoryDistributionItemDto, isArray: true})
  readonly incomeDistribution!: CategoryDistributionItemDto[];

  constructor(response: ScheduledCommitmentsResponse) {
    this.period = response.period;
    this.monthlyIncome = response.monthlyIncome;
    this.monthlyExpenses = response.monthlyExpenses;
    this.netProjectedImpact = response.netProjectedImpact;
    this.projectedAvailableBalance = response.projectedAvailableBalance;
    this.incomeCommitmentPercentage = response.incomeCommitmentPercentage;
    this.expenseDistribution = response.expenseDistribution.map((item) => ({...item}));
    this.incomeDistribution = response.incomeDistribution.map((item) => ({...item}));
  }
}

import type {AccountProgressionCreditUsage} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Credit capacity at the reported month end, in integer cents (8.13). */
export class AccountProgressionCreditUsageDto implements AccountProgressionCreditUsage {
  @ApiProperty({example: 500_000, description: 'Límite de crédito, en centavos.'})
  readonly limit!: number;

  @ApiProperty({example: 120_000, description: 'Crédito utilizado, en centavos.'})
  readonly used!: number;

  @ApiProperty({example: 380_000, description: 'Crédito disponible, en centavos.'})
  readonly available!: number;

  @ApiProperty({example: 76, description: 'Porcentaje de crédito disponible.'})
  readonly availablePercentage!: number;
}

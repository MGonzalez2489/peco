import type {AccountProgressionResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountProgressionAccountDto} from './account-progression-account.dto';
import {AccountProgressionCreditUsageDto} from './account-progression-credit-usage.dto';
import {AccountProgressionPointDto} from './account-progression-point.dto';

/** Public account progression in the D65 single-resource shape (8.13). */
export class AccountProgressionResponseDto implements AccountProgressionResponse {
  @ApiProperty({example: '2026-11', description: 'Mes UTC consultado.'})
  readonly period!: string;

  @ApiProperty({type: AccountProgressionAccountDto})
  readonly account!: AccountProgressionAccountDto;

  @ApiProperty({example: 100_000, description: 'Saldo de apertura, en centavos.'})
  readonly initialBalance!: number;

  @ApiProperty({example: 150_000, description: 'Saldo de cierre, en centavos.'})
  readonly finalBalance!: number;

  @ApiProperty({type: AccountProgressionCreditUsageDto, nullable: true})
  readonly creditUsage!: AccountProgressionCreditUsageDto | null;

  @ApiProperty({type: AccountProgressionPointDto, isArray: true})
  readonly points!: AccountProgressionPointDto[];

  constructor(response: AccountProgressionResponse) {
    this.period = response.period;
    this.account = {...response.account};
    this.initialBalance = response.initialBalance;
    this.finalBalance = response.finalBalance;
    this.creditUsage = response.creditUsage ? {...response.creditUsage} : null;
    this.points = response.points.map((point) => ({...point}));
  }
}

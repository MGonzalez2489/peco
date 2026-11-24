import type {PeriodSnapshotResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {AccountPeriodBalanceEntity, PeriodSnapshotEntity} from '../../database/entities';
import {AccountPeriodBalanceResponseDto} from './account-period-balance-response.dto';
import {PeriodSummaryResponseDto} from './period-summary-response.dto';

/** Complete immutable snapshot plus its frozen per-account breakdown (8.12). */
export class PeriodSnapshotResponseDto
  extends PeriodSummaryResponseDto
  implements PeriodSnapshotResponse
{
  @ApiProperty({type: AccountPeriodBalanceResponseDto, isArray: true})
  readonly accountBalances: AccountPeriodBalanceResponseDto[];

  constructor(snapshot: PeriodSnapshotEntity, balances: readonly AccountPeriodBalanceEntity[]) {
    super(snapshot);
    this.accountBalances = [...balances]
      .sort((left, right) => left.accountId - right.accountId)
      .map((balance) => new AccountPeriodBalanceResponseDto(balance));
  }
}

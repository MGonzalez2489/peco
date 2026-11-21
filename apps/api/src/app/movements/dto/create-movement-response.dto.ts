import type {CreateMovementResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountBalanceUpdateDto} from '../../accounts/dto/account-balance-update.dto';
import {MovementResponseDto} from '../../accounts/dto/movement-response.dto';
import type {MovementCreationResult} from '../types/movement-creation-result.type';

/** New ledger row plus the balances the client can refresh without a second request (8.10). */
export class CreateMovementResponseDto implements CreateMovementResponse {
  @ApiProperty({type: MovementResponseDto, description: 'Movimiento creado.'})
  readonly movement: MovementResponseDto;

  @ApiProperty({
    type: AccountBalanceUpdateDto,
    isArray: true,
    description: 'Saldos y versiones resultantes de las cuentas afectadas.',
  })
  readonly balances: AccountBalanceUpdateDto[];

  constructor(result: Extract<MovementCreationResult, {status: 'created'}>) {
    this.movement = new MovementResponseDto(
      result.movement,
      result.account,
      result.targetAccount,
      result.category,
    );
    this.balances = result.balances.map(
      (balance) =>
        new AccountBalanceUpdateDto(
          balance.accountPublicId,
          balance.currentBalance,
          balance.version,
        ),
    );
  }
}

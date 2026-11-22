import type {UpdateMovementResponse} from '@peco/contracts';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {AccountBalanceUpdateDto} from '../../accounts/dto/account-balance-update.dto';
import {MovementResponseDto} from '../../accounts/dto/movement-response.dto';
import type {MovementUpdateResult} from '../types/movement-update-result.type';

/** Edited movement plus the balances the client can refresh without a second request (8.10). */
export class UpdateMovementResponseDto implements UpdateMovementResponse {
  @ApiProperty({type: MovementResponseDto, description: 'Movimiento editado.'})
  readonly movement: MovementResponseDto;

  @ApiProperty({
    type: AccountBalanceUpdateDto,
    isArray: true,
    description: 'Saldos y versiones resultantes de las cuentas afectadas.',
  })
  readonly balances: AccountBalanceUpdateDto[];

  @ApiPropertyOptional({
    description: 'Identificador público del movimiento retirado por un cambio de tipo.',
  })
  readonly replacedPublicId?: string;

  constructor(
    result: Extract<MovementUpdateResult, {status: 'updated'} | {status: 'replaced'}>,
  ) {
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
    if (result.status === 'replaced') {
      this.replacedPublicId = result.replacedPublicId;
    }
  }
}

import type {RevertMovementResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountBalanceUpdateDto} from '../../accounts/dto/account-balance-update.dto';
import {MovementResponseDto} from '../../accounts/dto/movement-response.dto';

/** Payload of the reversal envelope: both immutable rows and the refreshed balances (8.10/US-507). */
export class RevertMovementResponseDto implements RevertMovementResponse {
  @ApiProperty({
    type: MovementResponseDto,
    description: 'Movimiento original, marcado como revertido.',
  })
  readonly original: MovementResponseDto;

  @ApiProperty({
    type: MovementResponseDto,
    description: 'Contrapartida creada con la fecha y hora actuales en UTC.',
  })
  readonly reversal: MovementResponseDto;

  @ApiProperty({
    type: AccountBalanceUpdateDto,
    isArray: true,
    description: 'Saldos y versiones resultantes de las cuentas afectadas.',
  })
  readonly balances: AccountBalanceUpdateDto[];

  constructor(
    original: MovementResponseDto,
    reversal: MovementResponseDto,
    balances: RevertMovementResponse['balances'],
  ) {
    this.original = original;
    this.reversal = reversal;
    this.balances = balances.map(
      (balance) =>
        new AccountBalanceUpdateDto(
          balance.accountPublicId,
          balance.currentBalance,
          balance.version,
        ),
    );
  }
}

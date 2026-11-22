import type {DeleteMovementResult} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountBalanceUpdateDto} from '../../accounts/dto/account-balance-update.dto';

/** Payload of the movement deletion envelope (8.10/US-506). */
export class DeleteMovementResultDto implements DeleteMovementResult {
  @ApiProperty({description: 'Identificador público del movimiento eliminado.'})
  readonly deletedPublicId: string;

  @ApiProperty({
    type: AccountBalanceUpdateDto,
    isArray: true,
    description: 'Saldos y versiones resultantes de las cuentas afectadas.',
  })
  readonly balances: AccountBalanceUpdateDto[];

  constructor(deletedPublicId: string, balances: DeleteMovementResult['balances']) {
    this.deletedPublicId = deletedPublicId;
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

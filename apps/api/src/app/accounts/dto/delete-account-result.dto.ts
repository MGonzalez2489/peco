import type {DeleteAccountResult} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountBalanceUpdateDto} from './account-balance-update.dto';
import {MovementResponseDto} from './movement-response.dto';

/** Payload of the account deletion envelope (8.8/US-305). */
export class DeleteAccountResultDto implements DeleteAccountResult {
  @ApiProperty({description: 'Identificador público de la cuenta eliminada.'})
  readonly deletedAccountPublicId: string;

  @ApiProperty({
    type: () => MovementResponseDto,
    description: 'Movimiento de transferencia, o null si el saldo era cero.',
    nullable: true,
  })
  readonly transferMovement: MovementResponseDto | null;

  @ApiProperty({
    type: () => AccountBalanceUpdateDto,
    isArray: true,
    description: 'Saldos y versiones actualizados.',
  })
  readonly balances: AccountBalanceUpdateDto[];

  constructor(
    deletedAccountPublicId: string,
    transferMovement: MovementResponseDto | null,
    balances: AccountBalanceUpdateDto[],
  ) {
    this.deletedAccountPublicId = deletedAccountPublicId;
    this.transferMovement = transferMovement;
    this.balances = balances;
  }
}

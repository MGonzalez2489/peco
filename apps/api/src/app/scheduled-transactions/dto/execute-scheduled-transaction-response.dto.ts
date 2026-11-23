import type {
  AccountBalanceUpdate,
  ExecuteScheduledTransactionResponse,
} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {AccountBalanceUpdateDto} from '../../accounts/dto/account-balance-update.dto';
import {MovementResponseDto} from '../../accounts/dto/movement-response.dto';
import type {
  MovementEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';
import {ScheduledOccurrenceResponseDto} from './scheduled-occurrence-response.dto';
import {ScheduledTransactionResponseDto} from './scheduled-transaction-response.dto';

/** One applied occurrence with its movement, the advanced schedule and refreshed balances (8.11). */
export class ExecuteScheduledTransactionResponseDto implements ExecuteScheduledTransactionResponse {
  @ApiProperty({type: ScheduledOccurrenceResponseDto, description: 'Resultado de la ocurrencia.'})
  readonly occurrence: ScheduledOccurrenceResponseDto;

  @ApiProperty({
    type: MovementResponseDto,
    description: 'Movimiento generado, o null si el período estaba cerrado.',
    nullable: true,
  })
  readonly movement: MovementResponseDto | null;

  @ApiProperty({type: ScheduledTransactionResponseDto, description: 'Programa actualizado.'})
  readonly schedule: ScheduledTransactionResponseDto;

  @ApiProperty({
    type: AccountBalanceUpdateDto,
    isArray: true,
    description: 'Saldos y versiones resultantes de las cuentas afectadas.',
  })
  readonly balances: AccountBalanceUpdateDto[];

  constructor(
    occurrence: ScheduledExecutionEntity,
    movement: MovementEntity | null,
    schedule: ScheduledTransactionEntity,
    balances: AccountBalanceUpdate[],
  ) {
    this.occurrence = new ScheduledOccurrenceResponseDto(occurrence);
    this.movement =
      movement
        ? new MovementResponseDto(
            movement,
            movement.account,
            movement.targetAccount ?? null,
            movement.category,
          )
        : null;
    this.schedule = ScheduledTransactionResponseDto.fromEntity(schedule);
    this.balances = balances.map(
      ({accountPublicId, currentBalance, version}) =>
        new AccountBalanceUpdateDto(accountPublicId, currentBalance, version),
    );
  }
}

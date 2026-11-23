import type {CancelScheduledOccurrenceResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {MovementResponseDto} from '../../accounts/dto/movement-response.dto';
import type {
  MovementEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
} from '../../database/entities';
import {ScheduledOccurrenceResponseDto} from './scheduled-occurrence-response.dto';
import {ScheduledTransactionResponseDto} from './scheduled-transaction-response.dto';

/** Canceled occurrence with its balance-neutral row and advanced schedule (10.7/US-605). */
export class CancelScheduledOccurrenceResponseDto implements CancelScheduledOccurrenceResponse {
  @ApiProperty({type: ScheduledOccurrenceResponseDto, description: 'Resultado de la ocurrencia.'})
  readonly occurrence: ScheduledOccurrenceResponseDto;

  @ApiProperty({
    type: MovementResponseDto,
    description: 'Movimiento cancelado generado (sin impacto en saldos).',
  })
  readonly movement: MovementResponseDto;

  @ApiProperty({type: ScheduledTransactionResponseDto, description: 'Programa actualizado.'})
  readonly schedule: ScheduledTransactionResponseDto;

  constructor(
    occurrence: ScheduledExecutionEntity,
    movement: MovementEntity,
    schedule: ScheduledTransactionEntity,
  ) {
    this.occurrence = new ScheduledOccurrenceResponseDto(occurrence);
    this.movement = new MovementResponseDto(
      movement,
      movement.account,
      movement.targetAccount ?? null,
      movement.category,
    );
    this.schedule = ScheduledTransactionResponseDto.fromEntity(schedule);
  }
}

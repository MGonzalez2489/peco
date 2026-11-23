import type {ScheduledExecutionStatus} from '@peco/contracts';
import {ScheduledExecutionStatusEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import type {ScheduledExecutionEntity} from '../../database/entities';

const OCCURRENCE_STATUSES: readonly ScheduledExecutionStatus[] = Object.values(
  ScheduledExecutionStatusEnum,
).map((member) => member.toString());

/** Public execution outcome; internal ids stay inside the API (8.11/US-604). */
export class ScheduledOccurrenceResponseDto {
  @ApiProperty({example: '2026-12-31', description: 'Fecha contemplada de la malla.'})
  readonly contemplatedDate: string;

  @ApiProperty({
    example: '2026-12-30',
    description: 'Fecha aplicada según la regla de día hábil.',
    nullable: true,
  })
  readonly occurrenceDate: string | null;

  @ApiProperty({enum: OCCURRENCE_STATUSES, example: ScheduledExecutionStatusEnum.APPLIED.toString()})
  readonly status: ScheduledExecutionStatus;

  @ApiProperty({
    example: 'PERIOD_CLOSED',
    description: 'Código estable del motivo, o null cuando no aplica.',
    nullable: true,
  })
  readonly reason: string | null;

  constructor(execution: ScheduledExecutionEntity) {
    this.contemplatedDate = execution.contemplatedDate;
    this.occurrenceDate = execution.occurrenceDate;
    this.status = execution.status;
    this.reason = execution.reason;
  }
}

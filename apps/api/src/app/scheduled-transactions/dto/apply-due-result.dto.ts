import type {ApplyDueResult, ScheduledExecutionStatus} from '@peco/contracts';
import {ScheduledExecutionStatusEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import type {ScheduledExecutionEntity} from '../../database/entities';

const OCCURRENCE_STATUSES: readonly ScheduledExecutionStatus[] = Object.values(
  ScheduledExecutionStatusEnum,
).map((member) => member.toString());

/** One per-occurrence row in the catch-up summary (8.11/US-606). */
export class ApplyDueResultDto implements ApplyDueResult {
  @ApiProperty({example: 'schedule-public-id'})
  readonly schedulePublicId: string;

  @ApiProperty({example: '2026-04-30', description: 'Fecha contemplada de la malla.'})
  readonly contemplatedDate: string;

  @ApiProperty({
    example: '2026-04-30',
    description: 'Fecha aplicada según la regla de día hábil.',
    nullable: true,
  })
  readonly occurrenceDate: string | null;

  @ApiProperty({enum: OCCURRENCE_STATUSES, example: ScheduledExecutionStatusEnum.APPLIED.toString()})
  readonly status: ScheduledExecutionStatus;

  @ApiProperty({example: 'movement-public-id', nullable: true})
  readonly movementPublicId: string | null;

  @ApiProperty({example: 'PERIOD_CLOSED', nullable: true})
  readonly reason: string | null;

  constructor(
    schedulePublicId: string,
    occurrence: ScheduledExecutionEntity,
    movementPublicId: string | null,
  ) {
    this.schedulePublicId = schedulePublicId;
    this.contemplatedDate = occurrence.contemplatedDate;
    this.occurrenceDate = occurrence.occurrenceDate;
    this.status = occurrence.status;
    this.movementPublicId = movementPublicId;
    this.reason = occurrence.reason;
  }
}

import type {ApplyDueResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {ApplyDueResultDto} from './apply-due-result.dto';
import {ScheduledTransactionResponseDto} from './scheduled-transaction-response.dto';

/** Catch-up summary with stable domain counters (D65/D53/D58). */
export class ApplyDueResponseDto implements ApplyDueResponse {
  @ApiProperty({example: '2026-05-02'})
  readonly asOf: string;

  @ApiProperty({type: ApplyDueResultDto, isArray: true})
  readonly results: ApplyDueResultDto[];

  @ApiProperty({type: ScheduledTransactionResponseDto, isArray: true})
  readonly schedules: ScheduledTransactionResponseDto[];

  @ApiProperty({example: 2})
  readonly applied: number;

  @ApiProperty({example: 1})
  readonly skipped: number;

  @ApiProperty({example: 0})
  readonly failed: number;

  @ApiProperty({
    example: 1,
    description: 'Ocurrencias omitidas por la ventana de gracia de usuario inactivo.',
  })
  readonly skippedWhileInactive: number;

  constructor(
    asOf: string,
    results: ApplyDueResultDto[],
    schedules: ScheduledTransactionResponseDto[],
    counters: Pick<ApplyDueResponse, 'applied' | 'skipped' | 'failed' | 'skippedWhileInactive'>,
  ) {
    this.asOf = asOf;
    this.results = results;
    this.schedules = schedules;
    this.applied = counters.applied;
    this.skipped = counters.skipped;
    this.failed = counters.failed;
    this.skippedWhileInactive = counters.skippedWhileInactive;
  }
}

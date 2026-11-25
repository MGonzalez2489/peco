import type {MovementProgressionResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import {MovementProgressionPointDto} from './movement-progression-point.dto';
import {MovementProgressionTotalsDto} from './movement-progression-totals.dto';

/** Public movement progression in the D65 single-resource shape (8.13). */
export class MovementProgressionResponseDto implements MovementProgressionResponse {
  @ApiProperty({example: '2026-11', description: 'Mes UTC consultado.'})
  readonly period!: string;

  @ApiProperty({type: MovementProgressionPointDto, isArray: true})
  readonly points!: MovementProgressionPointDto[];

  @ApiProperty({type: MovementProgressionTotalsDto})
  readonly totals!: MovementProgressionTotalsDto;

  constructor(response: MovementProgressionResponse) {
    this.period = response.period;
    this.points = response.points.map((point) => ({...point}));
    this.totals = {...response.totals};
  }
}

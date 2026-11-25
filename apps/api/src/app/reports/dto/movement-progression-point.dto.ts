import type {MovementProgressionPoint} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** One cumulative day in a movement progression (8.13). */
export class MovementProgressionPointDto implements MovementProgressionPoint {
  @ApiProperty({example: '2026-11-12', description: 'Día UTC de la observación.'})
  readonly date!: string;

  @ApiProperty({example: 155_000, description: 'Neto acumulado, en centavos.'})
  readonly net!: number;
}

import type {AccountProgressionPoint} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** One dated balance observation in an account progression (8.13). */
export class AccountProgressionPointDto implements AccountProgressionPoint {
  @ApiProperty({example: '2026-11-12', description: 'Fecha UTC del evento.'})
  readonly date!: string;

  @ApiProperty({example: 150_000, description: 'Saldo resultante, en centavos.'})
  readonly balance!: number;
}

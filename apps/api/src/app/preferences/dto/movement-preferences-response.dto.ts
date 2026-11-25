import type {PreferencesResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Movement preference section in the public response. */
export class MovementPreferencesResponseDto implements NonNullable<PreferencesResponse['movements']> {
  @ApiProperty({example: true, description: 'Los movimientos de reversa aparecen ocultos.'})
  readonly hideReversal: boolean;

  constructor(value: PreferencesResponse['movements']) {
    this.hideReversal = value.hideReversal;
  }
}

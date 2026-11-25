import type {PreferencesResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** Account preference section in the public response. */
export class AccountPreferencesResponseDto implements NonNullable<PreferencesResponse['accounts']> {
  @ApiProperty({example: false, description: 'Los balances aparecen ocultos.'})
  readonly hideBalance: boolean;

  constructor(value: PreferencesResponse['accounts']) {
    this.hideBalance = value.hideBalance;
  }
}

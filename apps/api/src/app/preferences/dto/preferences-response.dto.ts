import type {PreferencesResponse} from '@peco/contracts';
import {AppThemeEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import {AccountPreferencesResponseDto} from './account-preferences-response.dto';
import {MovementPreferencesResponseDto} from './movement-preferences-response.dto';

const THEMES: readonly PreferencesResponse['theme'][] = Object.values(AppThemeEnum).map((member) =>
  member.toString(),
);

/** Full preference object in the D65 single-resource shape (8.14). */
export class PreferencesResponseDto implements PreferencesResponse {
  @ApiProperty({enum: THEMES, example: AppThemeEnum.SYSTEM.toString()})
  readonly theme: PreferencesResponse['theme'];

  @ApiProperty({nullable: true, example: null, description: 'Fecha UTC de descarte del aviso.'})
  readonly pwaBannerDismissedAt: string | null;

  @ApiProperty({type: AccountPreferencesResponseDto})
  readonly accounts: AccountPreferencesResponseDto;

  @ApiProperty({type: MovementPreferencesResponseDto})
  readonly movements: MovementPreferencesResponseDto;

  @ApiProperty({
    nullable: true,
    example: '2026-11-25T10:00:00.000Z',
    description: 'Última persistencia; null cuando aún no existe la fila.',
  })
  readonly updatedAt: string | null;

  constructor(value: PreferencesResponse) {
    this.theme = value.theme;
    this.pwaBannerDismissedAt = value.pwaBannerDismissedAt;
    this.accounts = new AccountPreferencesResponseDto(value.accounts);
    this.movements = new MovementPreferencesResponseDto(value.movements);
    this.updatedAt = value.updatedAt;
  }
}

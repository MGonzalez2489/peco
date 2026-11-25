import type {AppTheme, UpdatePreferencesRequest} from '@peco/contracts';
import {AppThemeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform, Type} from 'class-transformer';
import {IsIn, IsOptional, Matches, ValidateNested} from 'class-validator';
import {AccountPreferencesSectionDto} from './account-preferences-section.dto';
import {MovementPreferencesSectionDto} from './movement-preferences-section.dto';

const THEMES: readonly AppTheme[] = Object.values(AppThemeEnum).map((member) => member.toString());
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const optionalString = ({value}: {value: unknown}): unknown =>
  typeof value === 'string' ? value : undefined;

const optionalTimestampOrNull = ({value}: {value: unknown}): unknown =>
  value === null || typeof value === 'string' ? value : undefined;

const optionalSection = ({value}: {value: unknown}): unknown =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value : undefined;

/** Partial preferences body (US-901). Unknown fields are rejected by the global pipe. */
export class UpdatePreferencesRequestDto implements UpdatePreferencesRequest {
  @ApiPropertyOptional({
    enum: THEMES,
    example: AppThemeEnum.DARK.toString(),
    description: 'Tema de la interfaz.',
  })
  @Transform(optionalString)
  @IsOptional()
  @IsIn(THEMES)
  theme?: AppTheme;

  @ApiPropertyOptional({
    nullable: true,
    example: null,
    description: 'Fecha UTC en que se descartó el aviso de la PWA; null lo restaura.',
  })
  @Transform(optionalTimestampOrNull)
  @IsOptional()
  @Matches(UTC_TIMESTAMP_PATTERN)
  pwaBannerDismissedAt?: string | null;

  @ApiPropertyOptional({
    type: AccountPreferencesSectionDto,
    description: 'Preferencias de cuentas.',
  })
  @Transform(optionalSection)
  @IsOptional()
  @ValidateNested()
  @Type(() => AccountPreferencesSectionDto)
  accounts?: AccountPreferencesSectionDto;

  @ApiPropertyOptional({
    type: MovementPreferencesSectionDto,
    description: 'Preferencias de movimientos.',
  })
  @Transform(optionalSection)
  @IsOptional()
  @ValidateNested()
  @Type(() => MovementPreferencesSectionDto)
  movements?: MovementPreferencesSectionDto;
}

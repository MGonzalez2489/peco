import type {UpdatePreferencesRequest} from '@peco/contracts';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsBoolean, IsOptional} from 'class-validator';

const optionalBoolean = ({value}: {value: unknown}): unknown =>
  typeof value === 'boolean' ? value : undefined;

/** Type-invalid booleans are dropped so the stored value survives the merge. */
export class AccountPreferencesSectionDto
  implements NonNullable<UpdatePreferencesRequest['accounts']>
{
  @ApiPropertyOptional({example: false, description: 'Ocultar los balances de las cuentas.'})
  @Transform(optionalBoolean)
  @IsOptional()
  @IsBoolean()
  hideBalance?: boolean;
}

import type {AccountType, ListMovementsQuery, MovementType} from '@peco/contracts';
import {AccountTypeEnum, MovementTypeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import {ListQueryDto} from '../../common/dto/list-query.dto';
import {IsMovementCursor} from '../validation/is-movement-cursor.decorator';
import {IsMovementDateRange} from '../validation/is-movement-date-range.decorator';
import {IsMovementPeriodExclusive} from '../validation/is-movement-period-exclusive.decorator';

const MOVEMENT_TYPES: readonly MovementType[] = Object.values(MovementTypeEnum).map((member) =>
  member.toString(),
);
const ACCOUNT_TYPES: readonly AccountType[] = Object.values(AccountTypeEnum).map((member) =>
  member.toString(),
);

const trimmed = ({value}: {value: unknown}): unknown =>
  typeof value === 'string' ? value.trim() : value;

const booleanFilter = ({value}: {value: unknown}): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Filters and keyset pagination for `GET /movements` (8.4/8.10/D101). */
export class ListMovementsQueryDto extends ListQueryDto implements ListMovementsQuery {
  @ApiPropertyOptional({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-11',
    description: 'Mes UTC; no se puede combinar con `from`/`to`.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  @IsMovementPeriodExclusive()
  period?: string;

  @ApiPropertyOptional({example: '2026-01-01', description: 'Inicio inclusivo del rango UTC.'})
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Fin inclusivo del rango UTC; máximo 24 meses desde `from`.',
  })
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsMovementDateRange()
  to?: string;

  @ApiPropertyOptional({enum: MOVEMENT_TYPES, example: MovementTypeEnum.EXPENSE.toString()})
  @IsOptional()
  @IsIn(MOVEMENT_TYPES)
  type?: MovementType;

  @ApiPropertyOptional({
    example: 'account-public-id',
    description: 'Coincide con la cuenta de origen o de destino.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @Length(1, 36)
  accountPublicId?: string;

  @ApiPropertyOptional({example: 'category-public-id'})
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @Length(1, 36)
  categoryPublicId?: string;

  @ApiPropertyOptional({enum: ACCOUNT_TYPES, example: AccountTypeEnum.CASH.toString()})
  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  accountType?: AccountType;

  @ApiPropertyOptional({
    example: 'Supermercado',
    description: 'Texto contenido en la nota, sin distinción de mayúsculas.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @Length(0, 500)
  note?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Oculta el original revertido y su contra; por defecto `false`.',
  })
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  excludeReversals?: boolean;

  @ApiPropertyOptional({example: true, description: 'Incluye movimientos cancelados.'})
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  includeCanceled?: boolean;

  @ApiPropertyOptional({
    example: 'eyJkIjoiMjAyNi0xMS0xMiIsImkiOjEyfQ',
    description: 'Cursor opaco devuelto por `meta.nextCursor`.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 512)
  @IsMovementCursor()
  cursor?: string;
}

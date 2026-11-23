import type {ListScheduledTransactionsQuery, ScheduledTransactionType} from '@peco/contracts';
import {ScheduledTransactionTypeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsBoolean, IsIn, IsOptional, IsString, Length, Matches} from 'class-validator';
import {ListQueryDto} from '../../common/dto/list-query.dto';
import {IsScheduledTransactionCursor} from '../validation/is-scheduled-transaction-cursor.decorator';

const SCHEDULE_TYPES: readonly ScheduledTransactionType[] = Object.values(
  ScheduledTransactionTypeEnum,
).map((member) => member.toString());

const trimmed = ({value}: {value: unknown}): unknown =>
  typeof value === 'string' ? value.trim() : value;

const booleanFilter = ({value}: {value: unknown}): unknown =>
  value === 'true' ? true : value === 'false' ? false : value;

/** Filters and keyset pagination for `GET /scheduled-transactions` (8.11/US-602). */
export class ListScheduledTransactionsQueryDto
  extends ListQueryDto
  implements ListScheduledTransactionsQuery
{
  @ApiPropertyOptional({
    pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
    example: '2026-11',
    description: 'Mes UTC; por defecto, el mes actual.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period?: string;

  @ApiPropertyOptional({enum: SCHEDULE_TYPES, example: ScheduledTransactionTypeEnum.EXPENSE.toString()})
  @IsOptional()
  @IsIn(SCHEDULE_TYPES)
  type?: ScheduledTransactionType;

  @ApiPropertyOptional({example: true, description: 'Omitido incluye activos y pausados.'})
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({example: false, description: 'Omitido incluye ambos valores.'})
  @IsOptional()
  @Transform(booleanFilter)
  @IsBoolean()
  autoApply?: boolean;

  @ApiPropertyOptional({
    example: 'account-public-id',
    description: 'Coincide con la cuenta de origen o de destino.',
  })
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @Length(1, 36)
  accountPublicId?: string;

  @ApiPropertyOptional({example: 'Renta', description: 'Texto contenido en el nombre.'})
  @IsOptional()
  @Transform(trimmed)
  @IsString()
  @Length(0, 80)
  search?: string;

  @ApiPropertyOptional({
    example: 'eyJkIjoiMjAyNi0xMi0wMSIsImkiOjEyfQ',
    description: 'Cursor opaco devuelto por `meta.nextCursor`.',
  })
  @IsOptional()
  @IsString()
  @Length(1, 512)
  @IsScheduledTransactionCursor()
  cursor?: string;
}

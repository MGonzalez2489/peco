import type {UpdateMovementRequest, MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateIf} from 'class-validator';

const MOVEMENT_TYPES: readonly MovementType[] = Object.values(MovementTypeEnum).map((member) =>
  member.toString(),
);

/** Partial ledger edit; `date` is rejected by the global whitelist (8.10/US-504). */
export class UpdateMovementRequestDto implements UpdateMovementRequest {
  @ApiPropertyOptional({enum: MOVEMENT_TYPES, example: MovementTypeEnum.EXPENSE.toString()})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsIn(MOVEMENT_TYPES)
  type?: MovementType;

  @ApiPropertyOptional({example: 50000, description: 'Importe positivo en centavos.'})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount?: number;

  @ApiPropertyOptional({example: 'Supermercado', nullable: true, maxLength: 500})
  @IsOptional()
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(0, 500)
  note?: string | null;

  @ApiPropertyOptional({example: 'source-account', description: 'Cuenta de origen.'})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 36)
  accountPublicId?: string;

  @ApiPropertyOptional({example: 'category-public-id', description: 'Categoría aplicada.'})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 36)
  categoryPublicId?: string;

  @ApiPropertyOptional({example: 'target-account', description: 'Cuenta de destino en transferencias.'})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 36)
  targetAccountPublicId?: string;

  @ApiPropertyOptional({
    example: 0,
    minimum: 0,
    description: 'Versión esperada para el control optimista.',
  })
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  version?: number;
}

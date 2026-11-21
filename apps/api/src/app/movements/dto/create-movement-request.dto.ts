import type {CreateMovementRequest, MovementType} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Max, Min} from 'class-validator';

const MOVEMENT_TYPES: readonly MovementType[] = Object.values(MovementTypeEnum).map((member) =>
  member.toString(),
);

/** Ledger creation body; server-owned fields such as `version` are rejected by the whitelist (8.10). */
export class CreateMovementRequestDto implements CreateMovementRequest {
  @ApiProperty({enum: MOVEMENT_TYPES, example: MovementTypeEnum.EXPENSE.toString()})
  @IsIn(MOVEMENT_TYPES)
  type!: MovementType;

  @ApiProperty({example: 45000, description: 'Importe positivo en centavos.'})
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  amount!: number;

  @ApiPropertyOptional({
    example: '2026-11-12T15:04:05.123Z',
    description: 'Fecha UTC; por defecto, el momento actual.',
  })
  @IsOptional()
  @IsDateString({strict: true})
  date?: string;

  @ApiPropertyOptional({example: 'Supermercado', nullable: true, maxLength: 500})
  @IsOptional()
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(0, 500)
  note?: string | null;

  @ApiProperty({example: 'account-public-id', description: 'Cuenta de origen.'})
  @IsString()
  @Length(1, 36)
  accountPublicId!: string;

  @ApiPropertyOptional({example: 'category-public-id', description: 'Categoría; usa la raíz si se omite.'})
  @IsOptional()
  @IsString()
  @Length(1, 36)
  categoryPublicId?: string;

  @ApiPropertyOptional({example: 'target-account-public-id', description: 'Cuenta de destino en transferencias.'})
  @IsOptional()
  @IsString()
  @Length(1, 36)
  targetAccountPublicId?: string;
}

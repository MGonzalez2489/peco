import type {AccountType, UpdateAccountRequest} from '@peco/contracts';
import {AccountTypeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import {IsCreditLimitOnlyForCredit} from '../validation/credit-limit-only-for-credit.validator';

const ACCOUNT_TYPES: readonly AccountType[] = Object.values(AccountTypeEnum).map((member) =>
  member.toString(),
);

/** Mutable account metadata; server-owned fields are rejected by the global whitelist (8.8/US-303). */
export class UpdateAccountRequestDto implements UpdateAccountRequest {
  @ApiPropertyOptional({
    example: 'Ahorros',
    minLength: 1,
    maxLength: 80,
    description: 'Nombre de la cuenta; se recorta antes de validar.',
  })
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({enum: ACCOUNT_TYPES, example: AccountTypeEnum.SAVINGS.toString()})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsIn(ACCOUNT_TYPES)
  type?: AccountType;

  @ApiPropertyOptional({example: true})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  includeInTotal?: boolean;

  @ApiPropertyOptional({example: 500000, nullable: true})
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  targetGoal?: number | null;

  @ApiPropertyOptional({example: 1000000, nullable: true})
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  @IsCreditLimitOnlyForCredit()
  creditLimit?: number | null;

  @ApiPropertyOptional({example: '#10B981', nullable: true})
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string | null;

  @ApiPropertyOptional({example: 'banknote', nullable: true, minLength: 1, maxLength: 40})
  @IsOptional()
  @IsString()
  @Length(1, 40)
  icon?: string | null;

  @ApiPropertyOptional({example: true})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  pinToHome?: boolean;

  @ApiPropertyOptional({example: 'Cuenta principal', nullable: true, maxLength: 500})
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string | null;

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

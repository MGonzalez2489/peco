import type {AccountType, CreateAccountRequest} from '@peco/contracts';
import {AccountTypeEnum} from '@peco/enums';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
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

/** Account creation body (8.8/US-302); `isRoot` and `currentBalance` are not accepted. */
export class CreateAccountRequestDto implements CreateAccountRequest {
  @ApiProperty({
    example: 'Efectivo',
    minLength: 1,
    maxLength: 80,
    description: 'Nombre de la cuenta; se recorta antes de validar.',
  })
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({enum: ACCOUNT_TYPES, example: AccountTypeEnum.CASH.toString()})
  @IsIn(ACCOUNT_TYPES)
  type!: AccountType;

  @ApiProperty({
    example: 150000,
    description: 'Saldo inicial en centavos; solo CREDIT admite valores negativos.',
  })
  @IsInt()
  @Min(Number.MIN_SAFE_INTEGER)
  @Max(Number.MAX_SAFE_INTEGER)
  initialBalance!: number;

  @ApiPropertyOptional({example: true, default: true})
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

  @ApiPropertyOptional({example: 'banknote', nullable: true, maxLength: 40})
  @IsOptional()
  @IsString()
  @Length(1, 40)
  icon?: string | null;

  @ApiPropertyOptional({example: false, default: false})
  @ValidateIf((_dto: unknown, value: unknown) => value !== undefined)
  @IsBoolean()
  pinToHome?: boolean;

  @ApiPropertyOptional({example: 'Cuenta principal', nullable: true, maxLength: 500})
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string | null;
}

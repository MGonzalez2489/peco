import type {
  CreateScheduledTransactionRequest,
  RecurrenceFrequency,
  ScheduledTransactionType,
} from '@peco/contracts';
import {RecurrenceFrequencyEnum, ScheduledTransactionTypeEnum} from '@peco/enums';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import {IsEndDateNotBeforeAnchor} from '../validation/end-date-not-before-anchor.validator';

const SCHEDULE_TYPES: readonly ScheduledTransactionType[] = Object.values(
  ScheduledTransactionTypeEnum,
).map((member) => member.toString());
const FREQUENCIES: readonly RecurrenceFrequency[] = Object.values(RecurrenceFrequencyEnum).map(
  (member) => member.toString(),
);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Schedule creation body; server-owned fields such as the next dates are rejected by the whitelist. */
export class CreateScheduledTransactionRequestDto implements CreateScheduledTransactionRequest {
  @ApiProperty({example: 'Renta', minLength: 1, maxLength: 80})
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  name!: string;

  @ApiProperty({example: 800000, description: 'Importe positivo en centavos.'})
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  estimatedAmount!: number;

  @ApiProperty({enum: SCHEDULE_TYPES, example: ScheduledTransactionTypeEnum.EXPENSE.toString()})
  @IsIn(SCHEDULE_TYPES)
  type!: ScheduledTransactionType;

  @ApiProperty({example: 'category-public-id', description: 'Categoría aplicable al tipo.'})
  @IsString()
  @Length(1, 36)
  categoryPublicId!: string;

  @ApiProperty({example: 'source-account-public-id', description: 'Cuenta de origen.'})
  @IsString()
  @Length(1, 36)
  sourceAccountPublicId!: string;

  @ApiPropertyOptional({
    example: 'target-account-public-id',
    description: 'Cuenta de destino, obligatoria en transferencias.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 36)
  destinationAccountPublicId?: string | null;

  @ApiProperty({enum: FREQUENCIES, example: RecurrenceFrequencyEnum.MONTHLY.toString()})
  @IsIn(FREQUENCIES)
  frequency!: RecurrenceFrequency;

  @ApiPropertyOptional({example: 1, default: 1, minimum: 1, maximum: 365})
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiProperty({example: '2026-12-31', description: 'Primera ocurrencia contemplada en UTC.'})
  @IsDateString({strict: true})
  @Matches(DATE_ONLY)
  anchorDate!: string;

  @ApiPropertyOptional({example: true, default: false})
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @ApiPropertyOptional({example: 12, nullable: true, minimum: 1})
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  totalOccurrences?: number | null;

  @ApiPropertyOptional({
    example: '2027-12-31',
    description: 'Última ocurrencia contemplada permitida, inclusive.',
    nullable: true,
  })
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(DATE_ONLY)
  @IsEndDateNotBeforeAnchor()
  endDate?: string | null;
}

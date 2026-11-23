import type {
  RecurrenceFrequency,
  ScheduledTransactionType,
  UpdateScheduledTransactionRequest,
} from '@peco/contracts';
import {RecurrenceFrequencyEnum, ScheduledTransactionTypeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
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

/** Partial schedule edit; server-owned next dates and counters are rejected by the whitelist. */
export class UpdateScheduledTransactionRequestDto implements UpdateScheduledTransactionRequest {
  @ApiPropertyOptional({example: 'Renta', minLength: 1, maxLength: 80})
  @IsOptional()
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  name?: string;

  @ApiPropertyOptional({example: 800000, description: 'Importe positivo en centavos.'})
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  estimatedAmount?: number;

  @ApiPropertyOptional({enum: SCHEDULE_TYPES, example: ScheduledTransactionTypeEnum.EXPENSE.toString()})
  @IsOptional()
  @IsIn(SCHEDULE_TYPES)
  type?: ScheduledTransactionType;

  @ApiPropertyOptional({example: 'category-public-id'})
  @IsOptional()
  @IsString()
  @Length(1, 36)
  categoryPublicId?: string;

  @ApiPropertyOptional({example: 'source-account-public-id'})
  @IsOptional()
  @IsString()
  @Length(1, 36)
  sourceAccountPublicId?: string;

  @ApiPropertyOptional({
    example: 'target-account-public-id',
    description: 'Cuenta de destino, obligatoria si el tipo es TRANSFER.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @Length(1, 36)
  destinationAccountPublicId?: string | null;

  @ApiPropertyOptional({enum: FREQUENCIES, example: RecurrenceFrequencyEnum.MONTHLY.toString()})
  @IsOptional()
  @IsIn(FREQUENCIES)
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({example: 1, minimum: 1, maximum: 365})
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  interval?: number;

  @ApiPropertyOptional({example: '2026-12-31', description: 'Nueva primera fecha contemplada.'})
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(DATE_ONLY)
  anchorDate?: string;

  @ApiPropertyOptional({example: true})
  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @ApiPropertyOptional({example: 12, nullable: true, minimum: 1})
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  totalOccurrences?: number | null;

  @ApiPropertyOptional({example: '2027-12-31', nullable: true})
  @IsOptional()
  @IsDateString({strict: true})
  @Matches(DATE_ONLY)
  @IsEndDateNotBeforeAnchor()
  endDate?: string | null;

  @ApiPropertyOptional({example: 0, minimum: 0, description: 'Versión leída por el cliente.'})
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  version?: number;
}

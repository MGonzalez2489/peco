import type {CategoryApplyType, UpdateCategoryRequest} from '@peco/contracts';
import {CategoryApplyTypeEnum} from '@peco/enums';
import {ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsIn, IsOptional, IsString, Length, Matches} from 'class-validator';

const USER_CATEGORY_APPLY_TYPES: readonly CategoryApplyType[] = [
  CategoryApplyTypeEnum.INCOME.toString(),
  CategoryApplyTypeEnum.EXPENSE.toString(),
  CategoryApplyTypeEnum.BOTH.toString(),
];

/** Partial metadata update; a changed `displayName` re-derives the slug (8.9/US-402). */
export class UpdateCategoryRequestDto implements UpdateCategoryRequest {
  @ApiPropertyOptional({
    example: 'Café con leche',
    minLength: 1,
    maxLength: 80,
    description: 'Nombre visible; se recorta y se normaliza en el servidor.',
  })
  @IsOptional()
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  displayName?: string;

  @ApiPropertyOptional({example: '#F97316', nullable: true})
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string | null;

  @ApiPropertyOptional({example: 'coffee', nullable: true, maxLength: 40})
  @IsOptional()
  @IsString()
  @Length(1, 40)
  icon?: string | null;

  @ApiPropertyOptional({enum: USER_CATEGORY_APPLY_TYPES})
  @IsOptional()
  @IsIn(USER_CATEGORY_APPLY_TYPES)
  applyType?: CategoryApplyType;
}

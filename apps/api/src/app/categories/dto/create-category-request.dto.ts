import type {CategoryApplyType, CreateCategoryRequest} from '@peco/contracts';
import {CategoryApplyTypeEnum} from '@peco/enums';
import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger';
import {Transform} from 'class-transformer';
import {IsIn, IsOptional, IsString, Length, Matches} from 'class-validator';

/** User categories never accept `name`, `isRoot`, `isSystem`, `TRANSFER` or an owner (8.9). */
const USER_CATEGORY_APPLY_TYPES: readonly CategoryApplyType[] = [
  CategoryApplyTypeEnum.INCOME.toString(),
  CategoryApplyTypeEnum.EXPENSE.toString(),
  CategoryApplyTypeEnum.BOTH.toString(),
];

export class CreateCategoryRequestDto implements CreateCategoryRequest {
  @ApiProperty({
    example: 'Café',
    minLength: 1,
    maxLength: 80,
    description: 'Nombre visible; se recorta y se normaliza en el servidor.',
  })
  @Transform(({value}) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 80)
  displayName!: string;

  @ApiPropertyOptional({example: '#F97316', nullable: true})
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string | null;

  @ApiPropertyOptional({example: 'coffee', nullable: true, maxLength: 40})
  @IsOptional()
  @IsString()
  @Length(1, 40)
  icon?: string | null;

  @ApiProperty({enum: USER_CATEGORY_APPLY_TYPES, example: CategoryApplyTypeEnum.EXPENSE.toString()})
  @IsIn(USER_CATEGORY_APPLY_TYPES)
  applyType!: CategoryApplyType;
}

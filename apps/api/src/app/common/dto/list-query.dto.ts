import {ApiPropertyOptional} from '@nestjs/swagger';
import {Type} from 'class-transformer';
import {IsInt, IsOptional, Max, Min} from 'class-validator';
import {MAX_LIST_LIMIT} from '../constants/max-list-limit.constant';

/** Shared bounded pagination query for every list endpoint (8.4/D25). */
export class ListQueryDto {
  @ApiPropertyOptional({
    type: Number,
    minimum: 1,
    maximum: MAX_LIST_LIMIT,
    default: 20,
    description: 'Número máximo de elementos devueltos por página (1-100).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_LIMIT)
  limit = 20;
}

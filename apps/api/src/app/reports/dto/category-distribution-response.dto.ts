import type {CategoryDistributionResponse} from '@peco/contracts';
import {MovementTypeEnum} from '@peco/enums';
import {ApiProperty} from '@nestjs/swagger';
import {CategoryDistributionItemDto} from './category-distribution-item.dto';

/** Public category distribution in the D65 single-resource shape (8.13). */
export class CategoryDistributionResponseDto implements CategoryDistributionResponse {
  @ApiProperty({example: '2026-11', description: 'Mes UTC consultado.'})
  readonly period!: string;

  @ApiProperty({
    enum: [MovementTypeEnum.INCOME.toString(), MovementTypeEnum.EXPENSE.toString()],
    example: MovementTypeEnum.EXPENSE.toString(),
  })
  readonly type!: CategoryDistributionResponse['type'];

  @ApiProperty({example: 145_000, description: 'Total del período, en centavos.'})
  readonly total!: number;

  @ApiProperty({type: CategoryDistributionItemDto, isArray: true})
  readonly items!: CategoryDistributionItemDto[];

  constructor(response: CategoryDistributionResponse) {
    this.period = response.period;
    this.type = response.type;
    this.total = response.total;
    this.items = response.items.map((item) => ({...item}));
  }
}

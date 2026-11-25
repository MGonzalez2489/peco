import type {CategoryDistributionItem} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';

/** One category slice in the §8.13 distribution shape. */
export class CategoryDistributionItemDto implements CategoryDistributionItem {
  @ApiProperty({example: 'category-public-id', description: 'Identificador público de la categoría.'})
  readonly categoryPublicId!: string;

  @ApiProperty({example: 'Comida', description: 'Nombre visible de la categoría (D36).'})
  readonly displayName!: string;

  @ApiProperty({example: '#F97316', nullable: true, description: 'Color de la categoría.'})
  readonly color!: string | null;

  @ApiProperty({example: 'utensils', nullable: true, description: 'Icono de la categoría.'})
  readonly icon!: string | null;

  @ApiProperty({example: 90_000, description: 'Total de la categoría, en centavos.'})
  readonly amount!: number;

  @ApiProperty({example: 62, description: 'Porcentaje entero sobre el total del período.'})
  readonly percentage!: number;
}

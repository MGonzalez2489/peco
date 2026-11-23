import type {ScheduledCategorySummary} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {CategoryEntity} from '../../database/entities';

/** Minimal category identity embedded in schedule responses (8.11). */
export class ScheduledCategorySummaryDto implements ScheduledCategorySummary {
  @ApiProperty({description: 'Identificador público de la categoría.'})
  readonly publicId: string;

  @ApiProperty({description: 'Nombre visible de la categoría.'})
  readonly displayName: string;

  @ApiProperty({description: 'Color de la categoría.', nullable: true})
  readonly color: string | null;

  @ApiProperty({description: 'Icono de la categoría.', nullable: true})
  readonly icon: string | null;

  constructor(category: CategoryEntity) {
    this.publicId = category.publicId;
    this.displayName = category.displayName;
    this.color = category.color;
    this.icon = category.icon;
  }
}

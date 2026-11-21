import type {CategoryResponse} from '@peco/contracts';
import {ApiProperty} from '@nestjs/swagger';
import type {CategoryEntity} from '../../database/entities';

/** Public category shape; the global catalog and owned rows share this DTO (8.9). */
export class CategoryResponseDto implements CategoryResponse {
  @ApiProperty({description: 'Identificador público de la categoría.'})
  readonly publicId: string;

  @ApiProperty({description: 'Slug normalizado de la categoría.'})
  readonly name: string;

  @ApiProperty({description: 'Nombre visible de la categoría.'})
  readonly displayName: string;

  @ApiProperty({description: 'Icono de la categoría.', nullable: true})
  readonly icon: string | null;

  @ApiProperty({description: 'Color de la categoría.', nullable: true})
  readonly color: string | null;

  @ApiProperty({description: 'Tipos de movimiento que acepta la categoría.'})
  readonly applyType: CategoryResponse['applyType'];

  @ApiProperty({description: 'Indica si es la categoría raíz.'})
  readonly isRoot: boolean;

  @ApiProperty({description: 'Indica si es una categoría del sistema.'})
  readonly isSystem: boolean;

  @ApiProperty({description: 'Fecha de creación en UTC.'})
  readonly createdAt: string;

  @ApiProperty({description: 'Fecha de última actualización en UTC.'})
  readonly updatedAt: string;

  constructor(category: CategoryEntity) {
    this.publicId = category.publicId;
    this.name = category.name;
    this.displayName = category.displayName;
    this.icon = category.icon;
    this.color = category.color;
    this.applyType = category.applyType;
    this.isRoot = category.isRoot;
    this.isSystem = category.isSystem;
    this.createdAt = category.createdAt;
    this.updatedAt = category.updatedAt;
  }
}

import {Injectable} from '@nestjs/common';
import type {CreateCategoryRequest, UpdateCategoryRequest} from '@peco/contracts';
import {toCategorySlug} from '@peco/utils';
import {DataSource, IsNull} from 'typeorm';
import {CategoryEntity} from '../../database/entities';
import {SYSTEM_CATEGORY_SEED} from '../constants/system-categories.constant';
import {categoryNameTakenException} from '../utils/category-name-taken.exception';

/** Global catalog plus owner-scoped category reads and writes (8.9/D36/D64). */
@Injectable()
export class CategoryRepository {
  constructor(private readonly dataSource: DataSource) {}

  findVisibleByUser(userId: number): Promise<CategoryEntity[]> {
    return this.dataSource.getRepository(CategoryEntity).find({
      where: [
        {userId: IsNull(), deletedAt: IsNull()},
        {userId, deletedAt: IsNull()},
      ],
      order: {isRoot: 'DESC', displayName: 'ASC', createdAt: 'ASC', id: 'ASC'},
    });
  }

  findActiveByPublicId(publicId: string): Promise<CategoryEntity | null> {
    return this.dataSource.getRepository(CategoryEntity).findOne({
      where: {publicId, deletedAt: IsNull()},
    });
  }

  /**
   * Idempotent deployment seed of the 10 global rows. Rows created earlier by
   * D98 (root) and D96 (transfer) are reused instead of duplicated.
   */
  async ensureSystemCatalog(): Promise<void> {
    const repository = this.dataSource.getRepository(CategoryEntity);

    for (const seed of SYSTEM_CATEGORY_SEED) {
      const existing = await repository.findOne({
        where: {userId: IsNull(), name: seed.name, deletedAt: IsNull()},
      });
      if (existing) {
        continue;
      }

      try {
        await repository.save(
          repository.create({
            userId: null,
            name: seed.name,
            displayName: seed.displayName,
            icon: seed.icon,
            color: seed.color,
            applyType: seed.applyType,
            isRoot: seed.isRoot,
            isSystem: seed.isSystem,
            deletedAt: null,
          }),
        );
      } catch (error: unknown) {
        // A concurrent deployment may have won the unique(ownerKey, activeName) race.
        if (!isDuplicateCategoryNameError(error)) {
          throw error;
        }
      }
    }
  }

  async create(userId: number, request: CreateCategoryRequest): Promise<CategoryEntity> {
    const name = toCategorySlug(request.displayName);
    if (await this.findDuplicate(userId, name)) {
      throw categoryNameTakenException();
    }

    const repository = this.dataSource.getRepository(CategoryEntity);

    try {
      return await repository.save(
        repository.create({
          userId,
          name,
          displayName: request.displayName,
          icon: request.icon ?? null,
          color: request.color ?? null,
          applyType: request.applyType,
          isRoot: false,
          isSystem: false,
          deletedAt: null,
        }),
      );
    } catch (error: unknown) {
      if (isDuplicateCategoryNameError(error)) {
        throw categoryNameTakenException();
      }
      throw error;
    }
  }

  async update(
    category: CategoryEntity,
    request: UpdateCategoryRequest,
  ): Promise<CategoryEntity> {
    const nextName =
      request.displayName === undefined ? category.name : toCategorySlug(request.displayName);
    const nameChanged = nextName !== category.name;

    if (nameChanged && (await this.findDuplicate(category.userId ?? 0, nextName))) {
      throw categoryNameTakenException();
    }

    category.name = nextName;
    if (request.displayName !== undefined) {
      category.displayName = request.displayName;
    }
    if (request.icon !== undefined) {
      category.icon = request.icon;
    }
    if (request.color !== undefined) {
      category.color = request.color;
    }
    if (request.applyType !== undefined) {
      category.applyType = request.applyType;
    }

    try {
      return await this.dataSource.getRepository(CategoryEntity).save(category);
    } catch (error: unknown) {
      if (nameChanged && isDuplicateCategoryNameError(error)) {
        throw categoryNameTakenException();
      }
      throw error;
    }
  }

  /** The global catalog and the caller's namespace share one slug key (D64). */
  private findDuplicate(userId: number, name: string): Promise<CategoryEntity | null> {
    return this.dataSource.getRepository(CategoryEntity).findOne({
      where: [
        {userId: IsNull(), name, deletedAt: IsNull()},
        {userId, name, deletedAt: IsNull()},
      ],
    });
  }
}

const isDuplicateCategoryNameError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';

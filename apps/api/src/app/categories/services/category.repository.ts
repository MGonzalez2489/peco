import {Injectable} from '@nestjs/common';
import {CategoryApplyTypeEnum} from '@peco/enums';
import {DataSource, IsNull} from 'typeorm';
import {CategoryEntity} from '../../database/entities';

/** Global catalog plus owner-scoped category reads (8.9/D36/D64). */
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

  /**
   * Bootstraps the single global root category (8.9). US-402 will extend this
   * find-or-create path to the full 10-row catalog, reusing this row and the
   * `transfer` row created by D96.
   */
  async ensureGlobalRoot(): Promise<void> {
    const repository = this.dataSource.getRepository(CategoryEntity);
    const existing = await repository.findOne({
      where: {userId: IsNull(), name: 'unknown', deletedAt: IsNull()},
    });
    if (existing) {
      return;
    }

    try {
      await repository.save(
        repository.create({
          userId: null,
          name: 'unknown',
          displayName: 'Otros',
          icon: 'folder-open',
          color: '#6B7280',
          applyType: CategoryApplyTypeEnum.BOTH.toString(),
          isRoot: true,
          isSystem: false,
          deletedAt: null,
        }),
      );
    } catch (error: unknown) {
      // A concurrent instance may have won the unique(ownerKey, activeName) race.
      if (!isDuplicateCategoryNameError(error)) {
        throw error;
      }
    }
  }
}

const isDuplicateCategoryNameError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 'ER_DUP_ENTRY';

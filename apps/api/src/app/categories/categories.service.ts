import {Injectable, type OnModuleInit} from '@nestjs/common';
import type {CreateCategoryRequest, UpdateCategoryRequest} from '@peco/contracts';
import type {UserEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {CategoryResponseDto} from './dto/category-response.dto';
import {CategoryRepository} from './services/category.repository';
import {categoryNotFoundException} from './utils/category-not-found.exception';
import {categorySystemProtectedException} from './utils/category-system-protected.exception';

/** Global catalog plus caller-owned category reads and writes (US-401/US-402). */
@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.categories.ensureSystemCatalog();
  }

  async list(publicId: string): Promise<CategoryResponseDto[]> {
    const user = await this.requireUser(publicId);
    const categories = await this.categories.findVisibleByUser(user.id);

    return categories.map((category) => new CategoryResponseDto(category));
  }

  async create(publicId: string, request: CreateCategoryRequest): Promise<CategoryResponseDto> {
    const user = await this.requireUser(publicId);
    const category = await this.categories.create(user.id, request);

    return new CategoryResponseDto(category);
  }

  async update(
    publicId: string,
    categoryPublicId: string,
    request: UpdateCategoryRequest,
  ): Promise<CategoryResponseDto> {
    const user = await this.requireUser(publicId);
    const category = await this.categories.findActiveByPublicId(categoryPublicId);

    if (!category) {
      throw categoryNotFoundException();
    }
    if (category.userId === null || category.isRoot || category.isSystem) {
      throw categorySystemProtectedException();
    }
    if (category.userId !== user.id) {
      throw categoryNotFoundException();
    }

    return new CategoryResponseDto(await this.categories.update(category, request));
  }

  private async requireUser(publicId: string): Promise<UserEntity> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    return user;
  }
}

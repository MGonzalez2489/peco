import {Injectable, type OnModuleInit} from '@nestjs/common';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {CategoryResponseDto} from './dto/category-response.dto';
import {CategoryRepository} from './services/category.repository';

/** Global plus caller-owned category reads; the root catalog row exists after boot (US-401). */
@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.categories.ensureGlobalRoot();
  }

  async list(publicId: string): Promise<CategoryResponseDto[]> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const categories = await this.categories.findVisibleByUser(user.id);

    return categories.map((category) => new CategoryResponseDto(category));
  }
}

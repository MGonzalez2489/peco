import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {CategoriesController} from './categories.controller';
import {CategoriesService} from './categories.service';
import {CategoryRepository} from './services/category.repository';

/** Shared system catalog and per-user categories (EP-04/US-401). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoryRepository],
})
export class CategoriesModule {}

import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {PreferencesController} from './preferences.controller';
import {PreferencesRepository} from './services/preferences.repository';
import {PreferencesService} from './services/preferences.service';

/** Owner-scoped preference reads and partial writes (US-901). */
@Module({
  imports: [AuthModule, DatabaseModule, UsersModule],
  controllers: [PreferencesController],
  providers: [PreferencesService, PreferencesRepository],
})
export class PreferencesModule {}

import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {MovementsController} from './movements.controller';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementDeleteRepository} from './services/movement-delete.repository';
import {MovementQueryRepository} from './services/movement-query.repository';
import {MovementReplaceRepository} from './services/movement-replace.repository';
import {MovementUpdateRepository} from './services/movement-update.repository';

/** Ledger creation, edits, atomic replaces, soft deletes and owner-scoped reads (US-501–506). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [MovementsController],
  providers: [
    MovementsService,
    MovementCreationRepository,
    MovementQueryRepository,
    MovementUpdateRepository,
    MovementReplaceRepository,
    MovementDeleteRepository,
    UtcClock,
  ],
})
export class MovementsModule {}

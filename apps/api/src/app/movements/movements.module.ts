import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {MovementsController} from './movements.controller';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementQueryRepository} from './services/movement-query.repository';
import {MovementUpdateRepository} from './services/movement-update.repository';

/** Ledger creation, same-type edits and owner-scoped, paginated reads (US-501–504). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [MovementsController],
  providers: [
    MovementsService,
    MovementCreationRepository,
    MovementQueryRepository,
    MovementUpdateRepository,
    UtcClock,
  ],
})
export class MovementsModule {}

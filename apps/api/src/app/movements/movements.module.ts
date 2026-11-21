import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {MovementsController} from './movements.controller';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementQueryRepository} from './services/movement-query.repository';

/** Ledger creation and owner-scoped, paginated reads (US-501/US-502). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [MovementsController],
  providers: [MovementsService, MovementCreationRepository, MovementQueryRepository, UtcClock],
})
export class MovementsModule {}

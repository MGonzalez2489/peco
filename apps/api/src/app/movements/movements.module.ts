import {Module} from '@nestjs/common';
import {AuthModule} from '../auth/auth.module';
import {UtcClock} from '../database/clock/utc-clock';
import {DatabaseModule} from '../database/database.module';
import {UsersModule} from '../users/users.module';
import {MovementsController} from './movements.controller';
import {MovementsService} from './movements.service';
import {MovementCreationRepository} from './services/movement-creation.repository';

/** Ledger creation with one serialized, atomic balance write (US-501). */
@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [MovementsController],
  providers: [MovementsService, MovementCreationRepository, UtcClock],
})
export class MovementsModule {}

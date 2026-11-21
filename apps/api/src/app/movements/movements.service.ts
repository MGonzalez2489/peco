import {Injectable} from '@nestjs/common';
import type {CreateMovementRequest} from '@peco/contracts';
import {MovementWriteStatusEnum} from '@peco/enums';
import {negativeBalanceConflictException} from '../accounts/utils/negative-balance-conflict.exception';
import {periodClosedException} from '../accounts/utils/period-closed.exception';
import {selfTransferException} from '../accounts/utils/self-transfer.exception';
import {transferRequiredException} from '../accounts/utils/transfer-required.exception';
import {UtcClock} from '../database/clock/utc-clock';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {CreateMovementResponseDto} from './dto/create-movement-response.dto';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {categoryNotCompatibleException} from './utils/category-not-compatible.exception';
import {movementResourceNotFoundException} from './utils/movement-resource-not-found.exception';

/** Ledger creation with stable conflict mapping and UTC date normalization (8.10/9.3/US-501). */
@Injectable()
export class MovementsService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly creations: MovementCreationRepository,
    private readonly clock: UtcClock,
  ) {}

  async create(
    publicId: string,
    request: CreateMovementRequest,
  ): Promise<CreateMovementResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const date = request.date ? new Date(request.date).toISOString() : this.clock.now();
    const result = await this.creations.create(user.id, {...request, date});

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw movementResourceNotFoundException();
    }
    if (result.status === MovementWriteStatusEnum.SELF_TRANSFER.toString()) {
      throw selfTransferException();
    }
    if (result.status === MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()) {
      throw transferRequiredException();
    }
    if (result.status === MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()) {
      throw categoryNotCompatibleException();
    }
    if (result.status === MovementWriteStatusEnum.NEGATIVE_BALANCE.toString()) {
      throw negativeBalanceConflictException();
    }
    if (result.status === MovementWriteStatusEnum.PERIOD_CLOSED.toString()) {
      throw periodClosedException();
    }

    return new CreateMovementResponseDto(result);
  }
}

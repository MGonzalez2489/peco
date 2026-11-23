import {Injectable} from '@nestjs/common';
import type {CreateScheduledTransactionRequest} from '@peco/contracts';
import {MovementWriteStatusEnum} from '@peco/enums';
import {selfTransferException} from '../accounts/utils/self-transfer.exception';
import {transferRequiredException} from '../accounts/utils/transfer-required.exception';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {categoryNotCompatibleException} from '../movements/utils/category-not-compatible.exception';
import {ScheduledTransactionResponseDto} from './dto/scheduled-transaction-response.dto';
import {ScheduledTransactionCreationRepository} from './services/scheduled-transaction-creation.repository';
import {scheduledTransactionResourceNotFoundException} from './utils/scheduled-transaction-resource-not-found.exception';

/** Authenticated schedule creation with stable resource and compatibility errors (8.11/US-601). */
@Injectable()
export class ScheduledTransactionsService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly creations: ScheduledTransactionCreationRepository,
  ) {}

  async create(
    publicId: string,
    request: CreateScheduledTransactionRequest,
  ): Promise<ScheduledTransactionResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const result = await this.creations.create(user.id, request);

    if (result.status === MovementWriteStatusEnum.NOT_FOUND.toString()) {
      throw scheduledTransactionResourceNotFoundException();
    }
    if (result.status === MovementWriteStatusEnum.TRANSFER_REQUIRED.toString()) {
      throw transferRequiredException();
    }
    if (result.status === MovementWriteStatusEnum.SELF_TRANSFER.toString()) {
      throw selfTransferException();
    }
    if (result.status === MovementWriteStatusEnum.CATEGORY_NOT_COMPATIBLE.toString()) {
      throw categoryNotCompatibleException();
    }

    return new ScheduledTransactionResponseDto(result.schedule, {
      category: result.category,
      sourceAccount: result.sourceAccount,
      destinationAccount: result.destinationAccount,
    });
  }
}

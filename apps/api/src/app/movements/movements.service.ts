import {Injectable} from '@nestjs/common';
import type {CreateMovementRequest, MovementTotals} from '@peco/contracts';
import {MovementWriteStatusEnum} from '@peco/enums';
import {MovementResponseDto} from '../accounts/dto/movement-response.dto';
import {negativeBalanceConflictException} from '../accounts/utils/negative-balance-conflict.exception';
import {periodClosedException} from '../accounts/utils/period-closed.exception';
import {selfTransferException} from '../accounts/utils/self-transfer.exception';
import {transferRequiredException} from '../accounts/utils/transfer-required.exception';
import {UtcClock} from '../database/clock/utc-clock';
import type {MovementEntity} from '../database/entities';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {CreateMovementResponseDto} from './dto/create-movement-response.dto';
import {ListMovementsQueryDto} from './dto/list-movements-query.dto';
import {MovementCreationRepository} from './services/movement-creation.repository';
import {MovementQueryRepository} from './services/movement-query.repository';
import type {MovementListFilter} from './types/movement-list-filter.type';
import {categoryNotCompatibleException} from './utils/category-not-compatible.exception';
import {movementNotFoundException} from './utils/movement-not-found.exception';
import {movementResourceNotFoundException} from './utils/movement-resource-not-found.exception';
import {periodUtcBounds} from './utils/period-utc-bounds.util';

/** Ledger reads and creation with stable conflict mapping and UTC normalization (8.10/US-501–503). */
@Injectable()
export class MovementsService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly creations: MovementCreationRepository,
    private readonly queries: MovementQueryRepository,
    private readonly clock: UtcClock,
  ) {}

  /** Resolves the period defaults inside the authenticated owner before reading (8.4/D101). */
  async list(
    publicId: string,
    query: ListMovementsQueryDto,
  ): Promise<{
    items: MovementResponseDto[];
    nextCursor: string | null;
    totals: MovementTotals;
  }> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const page = await this.queries.list(this.toFilter(user.id, query), query.cursor, query.limit);

    return {
      items: page.items.map((movement) => this.toResponse(movement)),
      nextCursor: page.nextCursor,
      totals: page.totals,
    };
  }

  /** Ownership, soft deletion and state links are resolved in one owner-scoped read (8.10/D37). */
  async findOne(publicId: string, movementPublicId: string): Promise<MovementResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const movement = await this.queries.findOwnerDetail(user.id, movementPublicId);
    if (!movement) {
      throw movementNotFoundException();
    }

    return this.toResponse(movement);
  }

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

  private toResponse(movement: MovementEntity): MovementResponseDto {
    return new MovementResponseDto(
      movement,
      movement.account,
      movement.targetAccount ?? null,
      movement.category,
    );
  }

  private toFilter(userId: number, query: ListMovementsQueryDto): MovementListFilter {
    const bounds = this.resolveBounds(query);
    const note = query.note?.trim();

    return {
      userId,
      from: bounds.from,
      to: bounds.to,
      type: query.type ?? null,
      accountPublicId: query.accountPublicId?.trim() || null,
      categoryPublicId: query.categoryPublicId?.trim() || null,
      accountType: query.accountType ?? null,
      note: note ? note.toLowerCase() : null,
      excludeReversals: query.excludeReversals ?? false,
      includeCanceled: query.includeCanceled ?? true,
    };
  }

  private resolveBounds(query: ListMovementsQueryDto): Pick<MovementListFilter, 'from' | 'to'> {
    if (query.period) {
      return periodUtcBounds(query.period);
    }

    const from = query.from ? `${query.from}T00:00:00.000Z` : null;
    const to = query.to ? `${query.to}T23:59:59.999Z` : null;
    if (from || to) {
      return {from, to};
    }

    return periodUtcBounds(this.clock.now().slice(0, 7));
  }
}

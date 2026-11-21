import {Injectable} from '@nestjs/common';
import type {
  CreateAccountRequest,
  UpdateAccountPinRequest,
  UpdateAccountRequest,
} from '@peco/contracts';
import {buildAccountSummary, isLiabilityAccount} from '@peco/utils';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {AccountBalanceUpdateDto} from './dto/account-balance-update.dto';
import {AccountResponseDto} from './dto/account-response.dto';
import {AccountSummaryDto} from './dto/account-summary.dto';
import {DeleteAccountResultDto} from './dto/delete-account-result.dto';
import {MovementResponseDto} from './dto/movement-response.dto';
import {AccountDeletionRepository} from './services/account-deletion.repository';
import {AccountRepository} from './services/account.repository';
import type {AccountListResult} from './types/account-list-result.type';
import {accountNotFoundException} from './utils/account-not-found.exception';
import {creditLimitNotAllowedException} from './utils/credit-limit-not-allowed.exception';
import {negativeBalanceConflictException} from './utils/negative-balance-conflict.exception';
import {negativeBalanceNotAllowedException} from './utils/negative-balance-not-allowed.exception';
import {periodClosedException} from './utils/period-closed.exception';
import {rootAccountProtectedException} from './utils/root-account-protected.exception';
import {selfTransferException} from './utils/self-transfer.exception';
import {transferRequiredException} from './utils/transfer-required.exception';
import {versionConflictException} from './utils/version-conflict.exception';

/** Owner-scoped account reads, metadata updates and explicit pinning (US-301–US-304). */
@Injectable()
export class AccountsService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly accounts: AccountRepository,
    private readonly deletions: AccountDeletionRepository,
  ) {}

  async list(publicId: string): Promise<AccountListResult> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const accounts = await this.accounts.findActiveByUser(user.id);
    const items = accounts.map((account) => new AccountResponseDto(account));

    return {
      items,
      summary: new AccountSummaryDto(buildAccountSummary(items)),
    };
  }

  async create(publicId: string, request: CreateAccountRequest): Promise<AccountResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    if (!isLiabilityAccount(request.type) && request.initialBalance < 0) {
      throw negativeBalanceNotAllowedException();
    }

    const account = await this.accounts.create(user.id, request);

    return new AccountResponseDto(account);
  }

  async findOne(publicId: string, accountPublicId: string): Promise<AccountResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const account = await this.accounts.findActiveByPublicId(user.id, accountPublicId);
    if (!account) {
      throw accountNotFoundException();
    }

    return new AccountResponseDto(account);
  }

  async update(
    publicId: string,
    accountPublicId: string,
    request: UpdateAccountRequest,
  ): Promise<AccountResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const account = await this.accounts.findActiveByPublicId(user.id, accountPublicId);
    if (!account) {
      throw accountNotFoundException();
    }

    if (request.version !== undefined && account.version !== request.version) {
      throw versionConflictException(request.version, account.version);
    }

    const nextType = request.type ?? account.type;
    if (!isLiabilityAccount(nextType) && account.currentBalance < 0) {
      throw negativeBalanceConflictException();
    }

    const nextCreditLimit =
      request.creditLimit !== undefined ? request.creditLimit : account.creditLimit;
    if (nextCreditLimit !== null && !isLiabilityAccount(nextType)) {
      throw creditLimitNotAllowedException();
    }

    const result = await this.accounts.update(user.id, accountPublicId, request);
    if (result.status === 'not-found') {
      throw accountNotFoundException();
    }
    if (result.status === 'conflict') {
      throw versionConflictException(request.version ?? account.version, result.currentVersion);
    }

    return new AccountResponseDto(result.account);
  }

  /** Sets `pinToHome` explicitly; an omitted version keeps last-write-wins (8.8/D94). */
  async setPin(
    publicId: string,
    accountPublicId: string,
    request: UpdateAccountPinRequest,
  ): Promise<AccountResponseDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const account = await this.accounts.findActiveByPublicId(user.id, accountPublicId);
    if (!account) {
      throw accountNotFoundException();
    }

    if (request.version !== undefined && account.version !== request.version) {
      throw versionConflictException(request.version, account.version);
    }

    // Reuses the US-303 compare-and-set write so pinning shares versioning and UTC stamping.
    const result = await this.accounts.update(user.id, accountPublicId, {
      pinToHome: request.pinToHome,
      version: request.version,
    });
    if (result.status === 'not-found') {
      throw accountNotFoundException();
    }
    if (result.status === 'conflict') {
      throw versionConflictException(request.version ?? account.version, result.currentVersion);
    }

    return new AccountResponseDto(result.account);
  }

  /** Soft-deletes a non-root account and transfers its balance in one transaction (8.8/D96/US-305). */
  async remove(
    publicId: string,
    accountPublicId: string,
    transferToPublicId?: string,
  ): Promise<DeleteAccountResultDto> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const result = await this.deletions.deleteWithTransfer(
      user.id,
      accountPublicId,
      transferToPublicId,
    );
    if (result.status === 'not-found') {
      throw accountNotFoundException();
    }
    if (result.status === 'root-protected') {
      throw rootAccountProtectedException();
    }
    if (result.status === 'self-transfer') {
      throw selfTransferException();
    }
    if (result.status === 'transfer-required') {
      throw transferRequiredException();
    }
    if (result.status === 'negative-balance') {
      throw negativeBalanceConflictException();
    }
    if (result.status === 'period-closed') {
      throw periodClosedException();
    }

    const balances = [
      new AccountBalanceUpdateDto(
        result.source.publicId,
        result.source.currentBalance,
        result.source.version,
      ),
    ];
    if (result.destination) {
      balances.push(
        new AccountBalanceUpdateDto(
          result.destination.publicId,
          result.destination.currentBalance,
          result.destination.version,
        ),
      );
    }

    const movement =
      result.movement && result.movementAccount && result.targetAccount && result.category
        ? new MovementResponseDto(
            result.movement,
            result.movementAccount,
            result.targetAccount,
            result.category,
          )
        : null;

    return new DeleteAccountResultDto(result.source.publicId, movement, balances);
  }
}

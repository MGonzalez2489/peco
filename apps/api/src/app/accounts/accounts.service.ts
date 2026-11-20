import {Injectable} from '@nestjs/common';
import type {CreateAccountRequest, UpdateAccountRequest} from '@peco/contracts';
import {buildAccountSummary, isLiabilityAccount} from '@peco/utils';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {AccountResponseDto} from './dto/account-response.dto';
import {AccountSummaryDto} from './dto/account-summary.dto';
import {AccountRepository} from './services/account.repository';
import type {AccountListResult} from './types/account-list-result.type';
import {accountNotFoundException} from './utils/account-not-found.exception';
import {creditLimitNotAllowedException} from './utils/credit-limit-not-allowed.exception';
import {negativeBalanceConflictException} from './utils/negative-balance-conflict.exception';
import {negativeBalanceNotAllowedException} from './utils/negative-balance-not-allowed.exception';
import {versionConflictException} from './utils/version-conflict.exception';

/** Owner-scoped account reads and metadata updates (US-301/US-302/US-303). */
@Injectable()
export class AccountsService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly accounts: AccountRepository,
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
}

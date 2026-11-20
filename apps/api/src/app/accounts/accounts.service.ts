import {Injectable} from '@nestjs/common';
import type {CreateAccountRequest} from '@peco/contracts';
import {buildAccountSummary, isLiabilityAccount} from '@peco/utils';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {AccountResponseDto} from './dto/account-response.dto';
import {AccountSummaryDto} from './dto/account-summary.dto';
import {AccountRepository} from './services/account.repository';
import type {AccountListResult} from './types/account-list-result.type';
import {negativeBalanceNotAllowedException} from './utils/negative-balance-not-allowed.exception';

/** Owner-scoped account listing and non-root account creation (US-301/US-302). */
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
}

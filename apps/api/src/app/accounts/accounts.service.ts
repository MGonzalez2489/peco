import {Injectable} from '@nestjs/common';
import {buildAccountSummary} from '@peco/utils';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {userNotFoundException} from '../users/utils/user-not-found.exception';
import {AccountResponseDto} from './dto/account-response.dto';
import {AccountSummaryDto} from './dto/account-summary.dto';
import {AccountRepository} from './services/account.repository';
import type {AccountListResult} from './types/account-list-result.type';

/** Account listing with summary figures derived from the same visible rows (US-301). */
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
}
